import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Loader2, Award, AlertCircle, MessageSquare, TrendingUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Evaluation {
  id: string
  marks: number
  max_marks: number
  remarks?: string
  evaluated_at: string
  code_submissions: {
    id: string
    submitted_at: string
    is_late: boolean
    experiments: {
      id: string
      title: string
      subject: string
    }
  }
}

export const Progress: React.FC = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [average, setAverage] = useState(0)

  useEffect(() => {
    if (!user) return

    const fetchEvaluations = async () => {
      try {
        const { data, error } = await supabase
          .from('evaluations')
          .select(`
            id,
            marks,
            max_marks,
            remarks,
            evaluated_at,
            code_submissions!inner (
              id,
              submitted_at,
              is_late,
              student_id,
              experiments (
                id,
                title,
                subject
              )
            )
          `)
          .eq('code_submissions.student_id', user.id)
          .order('evaluated_at', { ascending: false })

        if (error) throw error

        if (data) {
          const formatted = data.map((item: any) => ({
            id: item.id,
            marks: item.marks,
            max_marks: item.max_marks,
            remarks: item.remarks,
            evaluated_at: item.evaluated_at,
            code_submissions: {
              id: item.code_submissions?.id,
              submitted_at: item.code_submissions?.submitted_at,
              is_late: item.code_submissions?.is_late,
              experiments: Array.isArray(item.code_submissions?.experiments) 
                ? item.code_submissions.experiments[0] 
                : item.code_submissions?.experiments
            }
          })).filter(item => item.code_submissions?.experiments) as Evaluation[]

          setEvaluations(formatted)

          if (formatted.length > 0) {
            const sum = formatted.reduce((acc, curr) => acc + curr.marks, 0)
            setAverage(parseFloat((sum / formatted.length).toFixed(1)))
          } else {
            setAverage(0)
          }
        }
      } catch (err: any) {
        console.error('Error fetching student progress evaluations:', err)
        toast.error('Failed to load progress data')
      } finally {
        setLoading(false)
      }
    }

    fetchEvaluations()
  }, [user])

  const getStatusBadge = (avg: number) => {
    if (avg >= 7) {
      return {
        label: 'On Track',
        style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        desc: 'Keep up the excellent work! You are maintaining high performance.',
      }
    } else if (avg >= 5) {
      return {
        label: 'Needs Improvement',
        style: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        desc: 'You are passing, but focusing on teacher feedback can push your scores higher.',
      }
    } else {
      return {
        label: 'At Risk',
        style: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        desc: 'Warning: Your marks average is low. Re-evaluate your submissions and request revisions.',
      }
    }
  }

  const status = evaluations.length > 0 ? getStatusBadge(average) : null

  // Recharts Chart Data formatting
  const chartData = [...evaluations]
    .reverse() // show oldest to newest in chart
    .map((e) => ({
      name: e.code_submissions.experiments.title,
      marks: e.marks,
    }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">My Academic Progress</h2>
        <p className="text-slate-400 text-sm">Visualize your performance, average grades, and evaluation records.</p>
      </div>

      {evaluations.length > 0 ? (
        <>
          {/* Top Row: Cards */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Stat Box */}
            <div className="md:col-span-4 bg-[#1E293B] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Overall Average</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">{average}</span>
                  <span className="text-slate-500 text-lg font-bold">/ 10</span>
                </div>
              </div>

              {status && (
                <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Tracking Status:</span>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded border uppercase tracking-wide ${status.style}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed bg-[#0F172A] border border-slate-850 p-3 rounded-lg">
                    {status.desc}
                  </p>
                </div>
              )}
            </div>

            {/* Recharts Bar Chart */}
            <div className="md:col-span-8 bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#6366F1]" />
                Marks Per Experiment
              </h3>
              
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94A3B8" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#94A3B8" 
                      fontSize={10} 
                      domain={[0, 10]} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderColor: '#475569',
                        borderRadius: '0.5rem',
                        color: '#F8FAFC',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}
                      cursor={{ fill: '#334155', opacity: 0.15 }}
                    />
                    <Bar dataKey="marks" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Grades Table */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#6366F1]" />
              Detailed Grade History
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase bg-[#182235]/40">
                    <th className="px-4 py-3">Experiment</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {evaluations.map((ev) => {
                    const submittedAtFormatted = new Date(ev.code_submissions.submitted_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <tr key={ev.id} className="hover:bg-slate-800/20 transition-colors">
                        {/* Title details */}
                        <td className="px-4 py-4">
                          <div className="font-semibold text-white">
                            {ev.code_submissions.experiments.title}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {ev.code_submissions.experiments.subject}
                          </div>
                        </td>

                        {/* Submission Time */}
                        <td className="px-4 py-4 text-slate-400">
                          {submittedAtFormatted}
                        </td>

                        {/* Punctuality Badge */}
                        <td className="px-4 py-4">
                          {ev.code_submissions.is_late ? (
                            <span className="inline-block text-[10px] font-bold text-rose-450 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              LATE
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              ON TIME
                            </span>
                          )}
                        </td>

                        {/* Teacher Remarks */}
                        <td className="px-4 py-4 max-w-[200px] text-slate-350 italic">
                          {ev.remarks ? (
                            <div className="flex items-start gap-1.5" title={ev.remarks}>
                              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                              <span className="line-clamp-2">{ev.remarks}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">No remarks left</span>
                          )}
                        </td>

                        {/* Marks */}
                        <td className="px-4 py-4 text-right font-black text-white">
                          <span className="text-base text-white">{ev.marks}</span>
                          <span className="text-slate-500 text-xs font-semibold"> / {ev.max_marks}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm max-w-xl mx-auto shadow-md">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="font-bold text-white mb-1">No Graded Submissions Yet</p>
          <p className="text-slate-400 text-xs">As soon as your teachers review and grade your uploaded code submissions, your grades, average score, and chart progress will appear here.</p>
        </div>
      )}
    </div>
  )
}

export default Progress
