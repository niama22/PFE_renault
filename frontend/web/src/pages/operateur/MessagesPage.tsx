import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, Truck, Clock, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  getMessageThreads, getMessageThread, replyToDriver, markThreadRead,
  getTournees, type OMessage,
} from '@/api/operateur.api'
import type { Tournee } from '@/types'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

type ConvItem = {
  missionId: string
  chauffeurId: string
  chauffeurName: string
  lastMessage?: OMessage
  hasMessages: boolean
}

function ThreadItem({ item, active, onClick }: { item: ConvItem; active: boolean; onClick: () => void }) {
  const unread = item.lastMessage && !item.lastMessage.readByOperator && item.lastMessage.sender === 'CHAUFFEUR'
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3.5 border-b transition-colors flex items-start gap-3',
        active ? 'bg-brand-600/15 border-brand-500/30' : 'hover:bg-white/5 border-white/5'
      )}
      style={{ borderBottomColor: active ? undefined : 'var(--border-section)' }}
    >
      <div className={cn(
        'w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5',
        active ? 'bg-brand-600/30' : 'bg-white/8'
      )}>
        <Truck className="w-4 h-4 text-brand-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-0.5 gap-2">
          <span className="text-sm font-semibold text-slate-200 truncate">
            {item.chauffeurName}
          </span>
          {unread && <span className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0" />}
        </div>
        <p className="text-xs text-slate-500 truncate">
          {item.hasMessages
            ? (item.lastMessage!.sender === 'CHAUFFEUR' ? item.lastMessage!.content : `Vous: ${item.lastMessage!.content}`)
            : 'Aucun message — cliquez pour démarrer'}
        </p>
        <p className="text-[10px] text-slate-600 mt-1">
          Mission {item.missionId.substring(0, 8)}
          {item.lastMessage ? ` · ${formatDateTime(item.lastMessage.createdAt)}` : ''}
        </p>
      </div>
    </button>
  )
}

function Bubble({ msg }: { msg: OMessage }) {
  const isMe = msg.sender === 'OPERATEUR'
  return (
    <div className={cn('flex gap-3 mb-4', isMe ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold',
        isMe ? 'bg-brand-600/30 text-brand-400' : 'bg-slate-700/60 text-slate-300'
      )}>
        {isMe ? 'OP' : msg.senderName?.[0]?.toUpperCase() ?? 'C'}
      </div>
      <div className={cn('max-w-[65%]', isMe ? 'items-end' : 'items-start')}>
        <div className={cn(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
          isMe
            ? 'bg-brand-600/25 text-slate-100 border border-brand-500/25 rounded-tr-sm'
            : 'bg-white/8 text-slate-200 border border-white/10 rounded-tl-sm'
        )}>
          {msg.content}
        </div>
        <div className={cn('flex items-center gap-1 mt-1', isMe ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-slate-600">{formatDateTime(msg.createdAt)}</span>
          {isMe && <CheckCheck className="w-3 h-3 text-slate-600" />}
        </div>
      </div>
    </div>
  )
}

export default function OperateurMessagesPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<ConvItem | null>(null)
  const [reply, setReply] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: threads = [], isLoading: loadingThreads } = useQuery({
    queryKey: ['op-message-threads'],
    queryFn: getMessageThreads,
    refetchInterval: 10_000,
  })

  const { data: tournees = [], isLoading: loadingTournees } = useQuery<Tournee[]>({
    queryKey: ['tournees-all'],
    queryFn: () => getTournees(),
    refetchInterval: 30_000,
  })

  // Build merged conversation list — ONE entry per CHAUFFEUR (not per mission)
  const conversations: ConvItem[] = (() => {
    const map = new Map<string, ConvItem>()  // keyed by chauffeurId

    // From existing message threads — keep the most recently active missionId per chauffeur
    threads.forEach(msg => {
      const chauffeurId = msg.chauffeurId ?? ''
      if (!chauffeurId) return
      const existing = map.get(chauffeurId)
      const isNewer = !existing?.lastMessage || new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)
      if (!existing || isNewer) {
        map.set(chauffeurId, {
          missionId: msg.missionId,
          chauffeurId,
          chauffeurName: msg.sender === 'CHAUFFEUR' ? msg.senderName : (existing?.chauffeurName ?? 'Chauffeur'),
          lastMessage: msg,
          hasMessages: true,
        })
      }
    })

    // From tournées — add chauffeurs not yet in map
    tournees
      .filter(t => t.chauffeurId)
      .forEach(t => {
        const chauffeurId = t.chauffeurId!
        if (!map.has(chauffeurId)) {
          map.set(chauffeurId, {
            missionId: String(t.id),
            chauffeurId,
            chauffeurName: t.chauffeurName ?? 'Chauffeur inconnu',
            lastMessage: undefined,
            hasMessages: false,
          })
        }
      })

    return Array.from(map.values()).sort((a, b) => {
      if (a.lastMessage && b.lastMessage)
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
      if (a.lastMessage) return -1
      if (b.lastMessage) return 1
      return 0
    })
  })()

  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ['op-message-thread', selected?.missionId],
    queryFn: () => getMessageThread(selected!.missionId),
    enabled: !!selected,
    refetchInterval: 5_000,
  })

  const replyMutation = useMutation({
    mutationFn: () => replyToDriver(selected!.missionId, reply.trim(), selected!.chauffeurId),
    onSuccess: () => {
      setReply('')
      qc.invalidateQueries({ queryKey: ['op-message-thread', selected?.missionId] })
      qc.invalidateQueries({ queryKey: ['op-message-threads'] })
    },
    onError: () => toast.error('Erreur lors de l\'envoi'),
  })

  useEffect(() => {
    if (selected?.missionId) {
      markThreadRead(selected.missionId).catch(() => {})
      qc.invalidateQueries({ queryKey: ['op-message-threads'] })
    }
  }, [selected?.missionId, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function handleSend() {
    if (!reply.trim() || replyMutation.isPending) return
    replyMutation.mutate()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const unreadTotal = conversations.filter(
    c => c.lastMessage && !c.lastMessage.readByOperator && c.lastMessage.sender === 'CHAUFFEUR'
  ).length
  const loading = loadingThreads || loadingTournees

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Messagerie"
        subtitle={unreadTotal > 0 ? `${unreadTotal} message${unreadTotal > 1 ? 's' : ''} non lu${unreadTotal > 1 ? 's' : ''}` : 'Communication avec les chauffeurs'}
      />

      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>

        {/* Left — conversation list */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: 'var(--border-sidebar)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-section)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Chauffeurs ({conversations.length})
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4"><PageLoader /></div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Aucun chauffeur assigné</p>
                <p className="text-[10px] text-slate-600 mt-1">Assignez un chauffeur à une tournée d'abord</p>
              </div>
            ) : (
              conversations.map(item => (
                <ThreadItem
                  key={item.chauffeurId}
                  item={item}
                  active={selected?.chauffeurId === item.chauffeurId}
                  onClick={() => setSelected(item)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right — conversation */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                title="Sélectionnez un chauffeur"
                description="Choisissez un chauffeur dans la liste pour voir ou démarrer une conversation."
              />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-6 py-3.5 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-section)' }}>
                <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{selected.chauffeurName}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Mission {selected.missionId.substring(0, 8)}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {loadingMsgs ? (
                  <PageLoader />
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <MessageSquare className="w-10 h-10 text-slate-600" />
                    <p className="text-sm text-slate-500">Aucun message</p>
                    <p className="text-xs text-slate-600">Envoyez le premier message à {selected.chauffeurName}</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                        <Bubble msg={msg} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply input */}
              <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border-section)', background: 'var(--bg-card)' }}>
                <div className="flex items-end gap-3">
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message à ${selected.chauffeurName}… (Entrée pour envoyer)`}
                    rows={2}
                    maxLength={500}
                    className="input-dark flex-1 resize-none text-sm"
                    style={{ minHeight: 56 }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!reply.trim() || replyMutation.isPending}
                    className="h-14 px-5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-40 flex items-center gap-2 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span className="text-sm font-medium">{replyMutation.isPending ? '…' : 'Envoyer'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
