import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Copy, MessageSquare, RefreshCw } from 'lucide-react';
import { spec } from './model';

type Thread = {number:number;title:string;body:string|null;comments:number;state:string};
export type ReviewSnapshot = {item:string;label:string;url:string;key:string};
export function snapshotKey(url:string) {
  let h=2166136261;
  for(const c of url){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16);
}
let cache:Promise<Thread[]>|undefined;
function threads(refresh=false) {
  if(refresh)cache=undefined;
  return cache??=fetch('https://api.github.com/repos/Cichonship/tesla-console-review/issues?labels=design-review&state=all&per_page=100',{
    headers:{Accept:'application/vnd.github+json'},
  }).then(async r=>{if(!r.ok)throw new Error('Review history could not load. GitHub may be rate-limiting this connection. Try refreshing the thread list.');return await r.json() as Thread[];}).catch(e=>{cache=undefined;throw e;});
}
function Widget({snapshot,issue,enabled}:{snapshot:ReviewSnapshot;issue:number|null;enabled:boolean}) {
  const host=useRef<HTMLDivElement>(null);
  const [error,setError]=useState(false);
  useEffect(()=>{
    if(!enabled||!host.current)return;
    const container=host.current; container.replaceChildren();setError(false);
    if(!new URLSearchParams(location.search).has('utterances')){
      const url=new URL(snapshot.url);if(issue)url.searchParams.set('thread',String(issue));
      history.replaceState(null,'',url.href+'#review');
    }
    const script=document.createElement('script');
    script.src='https://utteranc.es/client.js';script.async=true;script.crossOrigin='anonymous';
    script.setAttribute('repo','Cichonship/tesla-console-review');
    script.setAttribute(issue?'issue-number':'issue-term',issue?String(issue):`console-v${spec.revision}:${snapshot.item}:${snapshot.key}`);
    script.setAttribute('label','design-review');script.setAttribute('theme','github-light');
    script.onerror=()=>setError(true);container.append(script);
    return ()=>{script.onerror=null;container.replaceChildren();};
  },[snapshot.item,snapshot.key,issue,enabled]);
  return <><div ref={host} className="comment-widget" data-testid="comment-widget"/>{error&&<p role="alert">The comment service couldn't load. Check your connection or privacy extensions and reload this page. Your CAD view is unaffected.</p>}</>;
}

export default function Comments({snapshot,onCopy}:{snapshot:ReviewSnapshot;onCopy:()=>void}) {
  const [enabled,setEnabled]=useState(()=>new URLSearchParams(location.search).has('utterances'));
  const [all,setAll]=useState<Thread[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const [issue,setIssue]=useState<number|null>(()=>{const n=new URLSearchParams(location.search).get('thread');return n&&/^[1-9][0-9]{0,8}$/.test(n)?Number(n):null;});
  const previousSnapshot=useRef(snapshot.item+snapshot.key);
  const prefix=`console-v${spec.revision}:${snapshot.item}:`;
  const matching=all.filter(t=>t.title.startsWith(prefix));
  const load=async(refresh=false)=>{setLoading(true);setError('');try{setAll(await threads(refresh));}catch(e){setError((e as Error).message);}finally{setLoading(false);}};
  useEffect(()=>{if(previousSnapshot.current!==snapshot.item+snapshot.key){setIssue(null);previousSnapshot.current=snapshot.item+snapshot.key;}if(enabled)void load();},[snapshot.item,snapshot.key,enabled]);
  const active=matching.find(t=>t.number===issue);
  const restored=active?.body?.match(/https:\/\/cichonship\.github\.io\/tesla-console-review\/[^\s)\]]*/)?.[0];
  return <section className="review-section section-wrap" id="review" aria-labelledby="review-heading">
    <div className="section-heading"><div><div className="eyebrow">04 / DESIGN REVIEW</div><h2 id="review-heading">Good design is a conversation.</h2><p>Comment on a dimension, a component, or a proposed change. The approved CAD stays unchanged.</p></div><MessageSquare size={32} strokeWidth={1}/></div>
    <div className="review-grid"><aside className="review-context"><span className="eyebrow">ATTACHED TO THIS REVIEW</span><h3>{snapshot.label}</h3><div className="revision-tag">BASELINE v{spec.revision}</div><p>Each thread is tied to this item and a saved model view. Replies remain in that thread's view context.</p><button className="text-action" onClick={onCopy}><Copy size={15}/>Copy view link</button>
      <div className="privacy-note"><strong>Public by design.</strong><br/>Comments are visible to everyone and stored in GitHub. Posting uses GitHub sign-in through Utterances. Don't include confidential information.</div>
      <details className="setup-note"><summary>Comment setup & moderation</summary><p>The owner must install the Utterances GitHub App on <strong>tesla-console-review</strong>. If posting reports that the app isn't installed, that approval is still pending.</p><p>The repository owner can hide or delete inappropriate comments and lock threads. GitHub's abuse protections and account requirements apply.</p></details>
    </aside><div className="review-main">
      <div className="thread-toolbar"><label htmlFor="review-thread">View thread<select id="review-thread" value={issue??''} onChange={e=>setIssue(e.target.value?Number(e.target.value):null)}><option value="">Current saved view</option>{matching.map(t=><option value={t.number} key={t.number}>View #{t.number} · {t.comments} {t.comments===1?'comment':'comments'}{t.state==='closed'?' · Closed':''}</option>)}</select></label><button className="icon-button" aria-label="Refresh review threads" onClick={()=>void load(true)} disabled={loading}><RefreshCw size={16}/></button></div>
      {error&&<p className="review-error" role="status">{error}</p>}
      {all.length===100&&<p className="review-error">Showing the 100 most recent review threads.</p>}
      {restored&&<a className="text-action" href={restored}>Restore this thread's model view<ArrowUpRight size={15}/></a>}
      {!enabled?<div className="comment-placeholder"><MessageSquare size={28} strokeWidth={1.3}/><h3>A specific note goes a long way.</h3><p>What should change, why, and how would you solve it?<br/>Comments stay here on the page.</p><button className="button dark" onClick={()=>setEnabled(true)}>Load comments<MessageSquare size={15}/></button><small>Loads Utterances and GitHub. Sign-in is required to post.</small></div>:<Widget snapshot={snapshot} issue={issue} enabled={enabled}/>}
    </div></div>
  </section>;
}
