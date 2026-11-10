import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useApp } from '../context/useApp';
import { useCustomer } from '../context/useCustomer';
import { demoApi } from './localApi';
import { demoPages } from './pages';
import { sampleLocation } from './fixtures';
import './demo.css';

export function DemoToolbar() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { acceptUser, signOut } = useAuth();
  const app = useApp();
  const { refreshData } = useCustomer();
  const navigate = useNavigate();
  async function visit(page) {
    if (page.role === 'guest') await signOut();
    else acceptUser(demoApi.selectRole(page.role));
    const towing = page.label === 'TowingRequest';
    const request = { serviceType: towing ? 'towing' : 'mechanic', vehicleId: 'demo-vehicle', issueType: towing ? 'Breakdown' : 'Battery', notes: 'Frontend presentation sample', landmark: 'Demo pickup', destination: 'Demo repair shop, Naga City', destinationMode: 'manual', towingCondition: { starts: 'unknown', rolls: 'yes', collision: 'no' }, matchingMode: 'manual', scheduledAt: null };
    app.updateRequest(request); app.setLocation(sampleLocation);
    app.setSearchProviders([demoApi.provider({ request, location: sampleLocation })]);
    app.setSelectedProviderId('demo-provider');
    setMessage(''); setOpen(false); refreshData(); navigate(page.path);
  }
  async function reset() {
    demoApi.reset(); await signOut(); setMessage('Demo data reset. Choose Customer demo or Mechanic demo.');
    app.resetRequest(); refreshData(); navigate('/');
  }
  return <>
    <button className="demo-launcher" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="demo-panel">{open ? 'Close page menu' : 'Pages · 53'}</button>
    {open && <section className="demo-panel" id="demo-panel" aria-label="Demo page selector">
      <h2>Present FixMyBuddy</h2>
      <p>Original screens with browser-local sample records. Use demo details only; no backend, SMS, support agent, or payment provider is connected.</p>
      <div className="demo-actions">
        <button type="button" onClick={() => visit({ role: 'customer', path: '/app' })}>Customer demo</button>
        <button type="button" onClick={() => visit({ role: 'mechanic', path: '/mechanic/jobs' })}>Mechanic demo</button>
        <button type="button" onClick={reset}>Reset demo data</button>
      </div>
      <p>Demo arrival/handover PIN: <strong>1234</strong>. Payment demo code: <strong>0000</strong>. Never enter a real banking PIN or password.</p>
      {message && <p role="status">{message}</p>}
      {[1, 2, 3, 4, 5].map(member => <details key={member}><summary>Member {member} · {demoPages.filter(page => page.member === member).length} page files</summary><div className="demo-page-list">{demoPages.filter(page => page.member === member).map(page => <button key={page.file} type="button" onClick={() => visit(page)}>{page.label}<small>{page.path}</small></button>)}</div></details>)}
      <div className="demo-actions">
        <button type="button" onClick={() => visit({ role: 'customer', path: '/history?booking=demo-completed' })}>Completed booking & rating</button>
        <button type="button" onClick={() => visit({ role: 'customer', path: '/history?booking=demo-towing' })}>Towing handover</button>
        <button type="button" onClick={() => visit({ role: 'customer', path: '/settings/language' })}>Language settings</button>
        <button type="button" onClick={() => visit({ role: 'customer', path: '/privacy' })}>Privacy policy</button>
      </div>
    </section>}
  </>;
}
