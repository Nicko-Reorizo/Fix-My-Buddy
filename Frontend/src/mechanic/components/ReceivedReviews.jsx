import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { mechanicService } from '../services/mechanicService';

export function ReceivedReviews() {
  const [reviews,setReviews]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    let pending=false;
    async function load() {
      if(pending) return;
      pending=true;
      try { const items=await mechanicService.getReviews(controller.signal); if(!controller.signal.aborted){setReviews(items);setError('');} }
      catch(failure){if(!controller.signal.aborted)setError(failure.message);}
      finally{pending=false;}
    }
    void load(); const timer=setInterval(load,10000);
    return ()=>{controller.abort();clearInterval(timer);};
  },[]);
  return <section className="mt-5"><h2 className="text-lg font-semibold">Customer reviews</h2>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {!reviews && !error && <p>Loading reviews…</p>}
    {reviews?.length===0 && <p>No reviews yet. Customers can rate your service after completion.</p>}
    {reviews?.map(review=><article key={review.id} className="my-3 rounded-xl border border-[rgb(var(--fmb-border))] p-3">
      <strong>{review.customerName}</strong><p className="flex items-center gap-1"><Star size={18} />{review.rating} / 5</p>
      {review.body && <p className="whitespace-pre-wrap">{review.body}</p>}
      <small>{review.bookingId} · {new Date(review.updatedAt).toLocaleDateString()}</small>
    </article>)}
  </section>;
}
