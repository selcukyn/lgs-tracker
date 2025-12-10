import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    // Core auth state
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // App data state
    const [studentList, setStudentList] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [examHistory, setExamHistory] = useState([]);
    const [dailyLogs, setDailyLogs] = useState([]);

    // LGS calculation subjects
    const subjects = [
        { name: 'Türkçe', coef: 4.348, color: '#f59e0b', maxQuestions: 20 },
        { name: 'T.C. İnkılap Tarihi', coef: 1.666, color: '#f97316', maxQuestions: 10 },
        { name: 'Din Kültürü', coef: 1.899, color: '#06b6d4', maxQuestions: 10 },
        { name: 'Yabancı Dil', coef: 1.5075, color: '#8b5cf6', maxQuestions: 10 },
        { name: 'Matematik', coef: 4.2538, color: '#6366f1', maxQuestions: 20 },
        { name: 'Fen Bilimleri', coef: 4.1230, color: '#ec4899', maxQuestions: 20 },
    ];

    const [stats, setStats] = useState({
        totalQuestions: 0,
        examAverage: 0,
        streakDays: 0,
        completionRate: 0
    });

    // Calculate LGS score
    const calculateLGS = (results) => {
        let score = 194.752082;
        let totalNet = 0;
        subjects.forEach(sub => {
            const res = results[sub.name] || { net: 0 };
            score += res.net * sub.coef;
            totalNet += res.net;
        });
        return { score: score.toFixed(3), totalNet: totalNet.toFixed(2) };
    };

    // Fetch user profile from database using direct fetch (bypass Supabase client issues)
    const fetchProfile = useCallback(async (userId, accessToken) => {
        if (!userId) return null;

        console.log('[Auth] Fetching profile for:', userId);

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[Auth] Missing Supabase config');
            return null;
        }

        try {
            // Use native fetch with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const headers = {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${accessToken || supabaseKey}`
            };

            console.log('[Auth] Fetching via REST API...');
            const response = await fetch(
                `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
                {
                    headers,
                    signal: controller.signal
                }
            );
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error('[Auth] Profile fetch failed:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('[Auth] Profile response:', data);

            if (data && data.length > 0) {
                console.log('[Auth] Profile loaded:', data[0].role);
                return data[0];
            }

            // Profile doesn't exist, create one
            console.log('[Auth] No profile found, creating...');
            const newProfile = {
                id: userId,
                role: 'student'
            };

            await fetch(`${supabaseUrl}/rest/v1/profiles`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(newProfile)
            });

            return newProfile;
        } catch (err) {
            if (err.name === 'AbortError') {
                console.error('[Auth] Profile fetch timed out');
            } else {
                console.error('[Auth] Profile fetch error:', err.message);
            }

            // Try cached profile
            try {
                const cached = localStorage.getItem('lgs-tracker-profile');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed?.id === userId) {
                        console.log('[Auth] Using cached profile');
                        return parsed;
                    }
                }
            } catch { }

            return null;
        }
    }, []);

    // Fetch student list for admin/teacher using direct fetch
    const fetchStudentList = useCallback(async (accessToken) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) return;

        console.log('[Data] Fetching student list');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(
                `${supabaseUrl}/rest/v1/profiles?role=eq.student&select=*`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${accessToken || supabaseKey}`
                    },
                    signal: controller.signal
                }
            );
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                console.log('[Data] Student list loaded:', data.length);
                setStudentList(data || []);
            }
        } catch (err) {
            console.error('[Data] Student list fetch error:', err.message);
        }
    }, []);

    // Initialize auth - runs once on mount
    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            setAuthError('Supabase yapılandırması eksik');
            return;
        }

        let mounted = true;

        const initAuth = async () => {
            console.log('[Auth] Initializing...');

            try {
                // Get current session with timeout
                let timedOut = false;
                const timeoutPromise = new Promise((resolve) =>
                    setTimeout(() => {
                        console.warn('[Auth] getSession timed out');
                        timedOut = true;
                        resolve({ data: { session: null }, error: null });
                    }, 3000)
                );

                const sessionPromise = supabase.auth.getSession();
                let { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

                // If timed out, try to restore from localStorage
                if (timedOut && !session) {
                    console.log('[Auth] Trying localStorage fallback...');
                    try {
                        const stored = localStorage.getItem('lgs-tracker-auth');
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            if (parsed?.access_token && parsed?.user) {
                                console.log('[Auth] Using session from localStorage');
                                session = parsed;
                            }
                        }
                    } catch (e) {
                        console.error('[Auth] localStorage parse error:', e);
                    }
                }

                if (error) {
                    console.error('[Auth] getSession error:', error);
                    if (mounted) {
                        setAuthError(error.message);
                        setLoading(false);
                    }
                    return;
                }

                if (session?.user) {
                    console.log('[Auth] Session found:', session.user.id);
                    if (mounted) {
                        setUser(session.user);
                        const profile = await fetchProfile(session.user.id, session.access_token);
                        if (profile && mounted) {
                            setUserProfile(profile);
                            setUserRole(profile.role);
                            // Cache profile
                            localStorage.setItem('lgs-tracker-profile', JSON.stringify(profile));
                            if (profile.role === 'student') {
                                setSelectedStudent(session.user.id);
                            } else {
                                await fetchStudentList(session.access_token);
                            }
                        }
                    }
                } else {
                    console.log('[Auth] No session found');
                }
            } catch (err) {
                console.error('[Auth] Init error:', err);
                if (mounted) setAuthError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] State change:', event);

            if (event === 'SIGNED_IN' && session?.user) {
                if (mounted) {
                    setUser(session.user);
                    setLoading(true);
                    const profile = await fetchProfile(session.user.id, session.access_token);
                    if (profile && mounted) {
                        setUserProfile(profile);
                        setUserRole(profile.role);
                        if (profile.role === 'student') {
                            setSelectedStudent(session.user.id);
                        } else {
                            await fetchStudentList(session.access_token);
                        }
                    }
                    setLoading(false);
                }
            } else if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setUser(null);
                    setUserProfile(null);
                    setUserRole(null);
                    setStudentList([]);
                    setSelectedStudent(null);
                    setExamHistory([]);
                    setDailyLogs([]);
                }
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('[Auth] Token refreshed');
            }
        });

        initAuth();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile, fetchStudentList]);

    // Fetch exam and solution data when selected student changes
    useEffect(() => {
        if (!supabase || !selectedStudent) {
            setExamHistory([]);
            setDailyLogs([]);
            return;
        }

        const fetchData = async () => {
            console.log('[Data] Fetching data for student:', selectedStudent);

            try {
                const { data: exams } = await supabase
                    .from('exams')
                    .select('*')
                    .eq('user_id', selectedStudent)
                    .order('date', { ascending: false });

                const { data: solutions } = await supabase
                    .from('solutions')
                    .select('*')
                    .eq('user_id', selectedStudent)
                    .order('date', { ascending: false });

                const formattedExams = (exams || []).map(e => ({
                    ...e,
                    totalScore: parseFloat(e.total_score),
                    totalNet: parseFloat(e.total_net),
                    results: e.results
                }));

                setExamHistory(formattedExams);
                setDailyLogs(solutions || []);
            } catch (err) {
                console.error('[Data] Fetch error:', err);
            }
        };

        fetchData();
    }, [selectedStudent]);

    // Calculate stats when data changes
    useEffect(() => {
        const totalQ = dailyLogs.reduce((acc, curr) => acc + (parseInt(curr.count) || 0), 0);
        const avgScore = examHistory.length > 0
            ? examHistory.reduce((acc, curr) => acc + curr.totalScore, 0) / examHistory.length
            : 0;
        const totalCorrect = dailyLogs.reduce((acc, curr) => acc + (parseInt(curr.correct) || 0), 0);
        const rate = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

        setStats({
            totalQuestions: totalQ,
            examAverage: avgScore.toFixed(1),
            streakDays: new Set(dailyLogs.map(l => l.date)).size,
            completionRate: rate
        });
    }, [dailyLogs, examHistory]);

    // Add exam
    const addExam = async (examData) => {
        const processedResults = {};
        Object.keys(examData.results).forEach(subjectName => {
            const r = examData.results[subjectName];
            const net = r.correct - (r.incorrect / 3);
            processedResults[subjectName] = { ...r, net };
        });

        const { score, totalNet } = calculateLGS(processedResults);

        const newExam = {
            name: examData.name,
            date: examData.date,
            total_score: parseFloat(score),
            total_net: parseFloat(totalNet),
            results: processedResults,
            user_id: selectedStudent || user?.id
        };

        const { data, error } = await supabase.from('exams').insert([newExam]).select();

        if (error) {
            alert('Sınav kaydedilemedi: ' + error.message);
            return;
        }

        setExamHistory(prev => [{
            ...data[0],
            totalScore: parseFloat(score),
            totalNet: parseFloat(totalNet)
        }, ...prev]);
    };

    // Delete exam
    const deleteExam = async (id) => {
        const { error } = await supabase.from('exams').delete().eq('id', id);
        if (error) {
            alert('Silme başarısız: ' + error.message);
            return;
        }
        setExamHistory(prev => prev.filter(e => e.id !== id));
    };

    // Add daily log
    const addDailyLog = async (log) => {
        const newLog = {
            date: log.date,
            subject: log.subject,
            topic: log.topic,
            count: parseInt(log.count),
            correct: parseInt(log.correct || 0),
            publisher: log.publisher,
            user_id: selectedStudent || user?.id
        };

        const { data, error } = await supabase.from('solutions').insert([newLog]).select();

        if (error) {
            alert('Çözüm kaydedilemedi: ' + error.message);
            return;
        }

        setDailyLogs(prev => [data[0], ...prev]);
    };

    // Delete daily log
    const deleteDailyLog = async (id) => {
        const { error } = await supabase.from('solutions').delete().eq('id', id);
        if (error) {
            alert('Silme başarısız: ' + error.message);
            return;
        }
        setDailyLogs(prev => prev.filter(l => l.id !== id));
    };

    // Update daily log
    const updateDailyLog = async (id, updatedLog) => {
        const { data, error } = await supabase
            .from('solutions')
            .update({
                date: updatedLog.date,
                subject: updatedLog.subject,
                topic: updatedLog.topic,
                count: parseInt(updatedLog.count),
                correct: parseInt(updatedLog.correct || 0),
                publisher: updatedLog.publisher
            })
            .eq('id', id)
            .select();

        if (error) {
            alert('Güncelleme başarısız: ' + error.message);
            return;
        }

        setDailyLogs(prev => prev.map(l => l.id === id ? data[0] : l));
    };

    // Logout function
    const logout = async () => {
        if (supabase) {
            await supabase.auth.signOut();
        }
    };

    // Refresh app data
    const refreshApp = async () => {
        if (!user) return;
        const profile = await fetchProfile(user.id);
        if (profile) {
            setUserProfile(profile);
            setUserRole(profile.role);
            if (profile.role !== 'student') {
                await fetchStudentList();
            }
        }
    };

    return (
        <DataContext.Provider value={{
            // Auth
            user,
            userProfile,
            userRole,
            loading,
            authError,
            logout,

            // Student management
            studentList,
            selectedStudent,
            setSelectedStudent,

            // Data
            examHistory,
            dailyLogs,
            stats,
            subjects,

            // Actions
            addExam,
            deleteExam,
            addDailyLog,
            deleteDailyLog,
            updateDailyLog,
            calculateLGS,
            refreshApp,
            fetchStudentList
        }}>
            {children}
        </DataContext.Provider>
    );
};
