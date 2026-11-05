import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RefreshCw, Send } from 'lucide-react';
import { mechanicService } from '../services/mechanicService';
import { MechanicHeader } from '../components/MechanicHeader';

export function MechanicChat() {
  const { jobId } = useParams();
  return <Conversation key={jobId} jobId={jobId} />;
}

function Conversation({ jobId }) {
  const [job,setJob] = useState(null);
  const [messages,setMessages] = useState([]);
  const [draft,setDraft] = useState('');
  const [error,setError] = useState('');
  const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false);
  const [retry,setRetry] = useState(0);
  const attempt = useRef(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let pending = false;
    const controller = new AbortController();
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const currentJob = await mechanicService.getJob(jobId,controller.signal);
        const channel = currentJob.type === 'towing' ? 'towing' : 'mechanic';
        const items = await mechanicService.getMessages(jobId,channel,controller.signal);
        if (!controller.signal.aborted) { setJob(currentJob); setMessages(items); setReady(true); setError(''); }
      } catch(failure) { if(!controller.signal.aborted) { setError(failure.message); setReady(false); } }
      finally { pending=false; }
    }
    void load();
    const timer=setInterval(load,3000);
    return () => { mounted.current=false; clearInterval(timer); controller.abort(); };
  },[jobId,retry]);
  async function send(event) {
    event.preventDefault();
    const body=draft.trim();
    if(!body || busy || !ready) return;
    if(attempt.current?.body !== body) attempt.current={body,id:crypto.randomUUID()};
    setBusy(true); setError('');
    try {
      const message=await mechanicService.sendMessage(jobId,job.type==='towing'?'towing':'mechanic',body,attempt.current.id);
      if(!mounted.current) return;
      setMessages(items=>items.some(item=>item.id===message.id)?items:[...items,message]);
      setDraft(''); attempt.current=null;
    } catch(failure) { if(mounted.current) setError(failure.message); }
    finally { if(mounted.current) setBusy(false); }
  }
  return <>
    <MechanicHeader showBrand={false} title="Chat with your customer" subtitle={job?.customer.name || 'Booking conversation'} />
    <Link className="customer-text-button" to={`/mechanic/jobs/${encodeURIComponent(jobId)}`}>Back to job</Link>
    <button type="button" className="auth-secondary mt-3" onClick={()=>setRetry(value=>value+1)}><RefreshCw size={18} />Refresh messages</button>
    <p className="auth-hint">Messages refresh automatically every three seconds.</p>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {!ready && !error && <p role="status">Loading conversation…</p>}
    <div className="support-messages" role="log" aria-live="polite" aria-label="Customer conversation">
      {ready && !messages.length && <p>No messages yet. Send a message to your customer.</p>}
      {messages.map(message=><article key={message.id} className={message.sender==='provider'?'from-customer':'from-support'}>
        <strong>{message.sender==='provider'?'You':job?.customer.name || 'Customer'}</strong>
        <p>{message.body}</p><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
        {message.sender==='provider' && message.readAt && <small>Read</small>}
      </article>)}
    </div>
    <form className="request-form" onSubmit={send}>
      <label className="request-field">Message<textarea rows={3} required maxLength={2000} value={draft} disabled={busy || !ready} onChange={event=>setDraft(event.target.value)} /></label>
      <button className="auth-primary" disabled={busy || !ready || !draft.trim()}><Send size={20} />{busy?'Sending…':'Send message'}</button>
    </form>
  </>;
}
