import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {

    const [subjects] = useState([
        { name: 'Türkçe', coef: 4.348, color: '#f59e0b', maxQuestions: 20 },
        { name: 'T.C. İnkılap Tarihi', coef: 1.666, color: '#f97316', maxQuestions: 10 },
        { name: 'Din Kültürü', coef: 1.899, color: '#06b6d4', maxQuestions: 10 },
        { name: 'Yabancı Dil', coef: 1.5075, color: '#8b5cf6', maxQuestions: 10 },
        { name: 'Matematik', coef: 4.2538, color: '#6366f1', maxQuestions: 20 },
        { name: 'Fen Bilimleri', coef: 4.1230, color: '#ec4899', maxQuestions: 20 },
    ]);

    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [userRole, setUserRole] = useState(null); // 'admin', 'teacher', 'student'
    const [userProfile, setUserProfile] = useState(null); // Full profile object
    const [lastError, setLastError] = useState(null); // DEBUG State
    const [debugHistory, setDebugHistory] = useState(['Init']); // Trace
    const [studentList, setStudentList] = useState([]); // For admins/teachers
    const [selectedStudent, setSelectedStudent] = useState(null); // The user_id we are currently viewing

    const addToLog = (msg) => {
        setDebugHistory(prev => [...prev.slice(-4), msg]);
    };


    const [examHistory, setExamHistory] = useState([]);
    const [dailyLogs, setDailyLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalQuestions: 0,
        examAverage: 0,
        streakDays: 0,
        completionRate: 0
    });

    // Calculate LGS Helper
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

    // Helper for delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    useEffect(() => {
        addToLog('Init');
        let mounted = true; // Prevent state updates after unmount

        // Guard against missing Supabase configuration so the app can still render the login page.
        if (!supabase) {
            setLastError('Supabase yapılandırması bulunamadı');
            setAuthLoading(false);
            return undefined;
        }

        const initializeSession = async () => {
            try {
                const { data: initial } = await supabase.auth.getSession();
                if (mounted && initial?.session) {
                    setSession(initial.session);
                    await fetchProfile(initial.session.user.id);
                }
            } catch (err) {
                console.error('Initial session load failed:', err);
            } finally {
                if (mounted) setAuthLoading(false);
            }
        };

        initializeSession();

        // onAuthStateChange handles session events
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            addToLog('Event: ' + event);

            try {
                if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                    setSession(session);
                    if (session) {
                        await delay(100); // Small delay to ensure token is ready
                        if (mounted) await fetchProfile(session.user.id);
                    }
                } else if (event === 'TOKEN_REFRESHED') {
                    setSession(session);
                } else if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setUserRole(null);
                    setStudentList([]);
                    setSelectedStudent(null);
                }
            } finally {
                if (mounted) setAuthLoading(false);
            }
        });

        // Safety net: if auth never responds (network issues), stop blocking the UI.
        const safetyTimeout = setTimeout(() => {
            if (mounted) setAuthLoading(false);
        }, 5000);

        return () => {
            mounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, []);
    // Fetch lock to prevent race conditions
    const fetchingRef = React.useRef(false);

    const fetchProfile = async (userId) => {
        if (!supabase) {
            addToLog('Supabase yok');
            setLastError('Supabase yapılandırması bulunamadı');
            return;
        }

        // Prevent concurrent fetches
        if (fetchingRef.current) {
            addToLog('Skip: Already fetching');
            return;
        }
        fetchingRef.current = true;

        try {
            addToLog('Fetch: ' + userId?.slice(0, 8));

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    addToLog('Missing -> Creating');
                    const { data: authUser } = await supabase.auth.getUser();
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert([
                            {
                                id: userId,
                                email: authUser?.user?.email,
                                full_name: authUser?.user?.user_metadata?.full_name,
                                role: 'student'
                            }
                        ]);

                    if (!insertError) {
                        addToLog('Created as student');
                        setUserRole('student');
                        setUserProfile({ id: userId, role: 'student' });
                        return;
                    } else {
                        addToLog('Create Err: ' + insertError.code);
                    }
                }

                addToLog('Err: ' + error.code);
                setLastError('Fetch Error: ' + error.message + ' Code: ' + error.code);
                console.error('Profile fetch error:', error);
                return;
            }

            if (data) {
                addToLog('Role: ' + data.role);
                setLastError(null);
                setUserRole(data.role);
                setUserProfile(data);

                if (data.role === 'student') {
                    setSelectedStudent(userId);
                } else if (!studentList.length) {
                    fetchStudentList();
                }
            }

        } catch (error) {
            addToLog('Exception: ' + error.message);
            console.error('Error fetching profile:', error);
        } finally {
            fetchingRef.current = false;
        }
    };

    const fetchStudentList = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'student');

        if (!error && data) {
            setStudentList(data);
            // Optionally select the first student or stay null
            // setSelectedStudent(null); // Explicitly null to force selection or empty view
        }
    };

    // Ensure we always have a profile after session is restored
    useEffect(() => {
        if (session && !userRole && !authLoading) {
            fetchProfile(session.user.id);
        }
    }, [session, userRole, authLoading]);

    // Fetch Data on Load (re-run when selectedStudent changes)
    useEffect(() => {
        const fetchData = async () => {
            // If no session, we are done loading (show login)
            if (!session) {
                setLoading(false);
                return;
            }

            // Only fetch if a student is selected (or if we are student)
            // Admins need to select a student first to see Data.
            if (!selectedStudent) {
                setExamHistory([]);
                setDailyLogs([]);
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                // Fetch Exams for SELECTED user
                const { data: exams, error: examError } = await supabase
                    .from('exams')
                    .select('*')
                    .eq('user_id', selectedStudent) // Important: Filter by selected student
                    .order('date', { ascending: false });

                if (examError) throw examError;

                // Fetch Solutions for SELECTED user
                const { data: solutions, error: solError } = await supabase
                    .from('solutions')
                    .select('*')
                    .eq('user_id', selectedStudent)
                    .order('date', { ascending: false });

                if (solError) throw solError;

                // Map DB structure to App structure
                const formattedExams = (exams || []).map(e => ({
                    ...e,
                    totalScore: parseFloat(e.total_score),
                    totalNet: parseFloat(e.total_net),
                    results: e.results // JSONB
                }));

                setExamHistory(formattedExams);
                setDailyLogs(solutions || []);

            } catch (error) {
                console.error('Error fetching data:', error);
                // Don't alert on simple RLS errors, just show empty
                // alert('Veri çekilemedi.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedStudent, session]); // Run when selectedStudent changes

    // Recalculate Stats whenever data changes
    useEffect(() => {
        if (loading) return;

        // Total Questions (from solutions + exams?) usually just solutions tracking
        const totalQ = dailyLogs.reduce((acc, curr) => acc + (parseInt(curr.count) || 0), 0);

        // Exam Average
        const avgScore = examHistory.length > 0
            ? examHistory.reduce((acc, curr) => acc + curr.totalScore, 0) / examHistory.length
            : 0;

        // Completion Rate
        const totalCorrect = dailyLogs.reduce((acc, curr) => acc + (parseInt(curr.correct) || 0), 0);
        const rate = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

        setStats({
            totalQuestions: totalQ,
            examAverage: avgScore.toFixed(1),
            streakDays: new Set(dailyLogs.map(l => l.date)).size,
            completionRate: rate
        });
    }, [dailyLogs, examHistory, loading]);


    const addExam = async (examData) => {
        const processedResults = {};
        Object.keys(examData.results).forEach(subjectName => {
            const r = examData.results[subjectName];
            const net = r.correct - (r.incorrect / 3);
            processedResults[subjectName] = { ...r, net };
        });

        const { score, totalNet } = calculateLGS(processedResults);

        // Optimistic Update
        const tempId = Date.now();
        const newExam = {
            id: tempId,
            name: examData.name,
            date: examData.date,
            totalScore: parseFloat(score),
            totalNet: parseFloat(totalNet),
            results: processedResults
        };
        setExamHistory(prev => [newExam, ...prev]);

        if (supabase) {
            const { data, error } = await supabase.from('exams').insert([{
                name: examData.name,
                date: examData.date,
                total_score: parseFloat(score),
                total_net: parseFloat(totalNet),
                results: processedResults
            }]).select();

            if (error) {
                console.error('Error adding exam:', error);
                // Revert optimistic update? For now just log.
                alert('Sınav kaydedilemedi!');
            } else {
                // Update ID with real ID from DB
                setExamHistory(prev => prev.map(e => e.id === tempId ? { ...e, id: data[0].id } : e));
            }
        }
    };

    const deleteExam = async (id) => {
        // Optimistic Delete
        const backup = [...examHistory];
        setExamHistory(prev => prev.filter(exam => exam.id !== id));

        if (supabase) {
            const { error } = await supabase.from('exams').delete().eq('id', id);
            if (error) {
                console.error('Delete failed:', error);
                alert('Silme işlemi başarısız oldu.');
                setExamHistory(backup);
            }
        }
    };

    const addDailyLog = async (log) => {
        // Optimistic Update
        const tempId = Date.now();
        setDailyLogs(prev => [{ ...log, id: tempId }, ...prev]);

        if (supabase) {
            const { data, error } = await supabase.from('solutions').insert([{
                date: log.date,
                subject: log.subject,
                topic: log.topic,
                count: parseInt(log.count),
                correct: parseInt(log.correct || 0),
                publisher: log.publisher
            }]).select();

            if (error) {
                console.error('Error adding log:', error);
                alert('Çözüm kaydedilemedi!');
            } else {
                setDailyLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: data[0].id } : l));
            }
        }
    };

    const refreshApp = async () => {
        setAuthLoading(true);
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
            setSession(data.session);
            await fetchProfile(data.session.user.id);
        }
        setAuthLoading(false);
    };

    return (
        <DataContext.Provider value={{
            session,
            userRole,
            userProfile,
            authLoading,
            studentList,
            selectedStudent,
            setSelectedStudent,
            stats,
            examHistory,
            subjects,
            dailyLogs,
            addExam,
            deleteExam,
            addDailyLog,
            calculateLGS,
            debugHistory,
            loading,
            refreshApp
        }}>
            {children}
        </DataContext.Provider>
    );
};
