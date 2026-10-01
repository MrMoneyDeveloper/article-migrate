import { ie } from './vendor.js';
import { TemplateCard } from './branding.js';
import { animate } from 'motion';

export function Workspace({ validate, plan, migrate, exportCsv }) {
  const [mode, setMode] = ie.useState('import');
  const [file, setFile] = ie.useState(null);
  const [validation, setValidation] = ie.useState(null);
  const [result, setResult] = ie.useState(null);
  const [exported, setExported] = ie.useState(null);
  const [busy, setBusy] = ie.useState('');
  const [confirmation, setConfirmation] = ie.useState('');
  const [notice, setNotice] = ie.useState({tone:'info', text:'Upload a CSV to begin. Validate it, then run a dry run before migration.'});
  const input = ie.useRef(null);
  const scrollArea = ie.useRef(null);
  const lock = ie.useRef(false);
  const valid = validation?.valid;
  const dryRun = result?.status === 'DRY_RUN';
  ie.useEffect(() => () => { if (exported?.url) URL.revokeObjectURL(exported.url); }, [exported]);
  ie.useEffect(() => { if (scrollArea.current) scrollArea.current.scrollTop=0; }, [notice]);
  ie.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const element=scrollArea.current?.querySelector('.notice');
    if (!element) return;
    const transition=animate(element,{opacity:[0.5,1]},{duration:0.18});
    return ()=>transition.stop();
  },[notice]);

  function selectFile(selected) {
    if (!selected || lock.current) return;
    setFile(selected); setValidation(null); setResult(null); setConfirmation('');
    setNotice({tone:'info',text:`Selected ${selected.name}. Click Validate CSV to check your articles.`});
  }
  async function run(action, work) {
    if(lock.current) return;
    lock.current=true; setBusy(action);
    try { await work(); } catch(error) {
      setNotice({tone:'error',text:error?.message || 'The request failed. Please try again.'});
    } finally { lock.current=false; setBusy(''); }
  }
  function check() { run('Validating', async () => {
    setValidation(null); setResult(null); setConfirmation('');
    const checked=validate(await file.text()); setValidation(checked);
    setNotice({tone:checked.valid?'success':'error',text:checked.valid?`CSV validation passed — ${checked.rows.length} articles ready. Run a dry run next.`:'CSV validation failed. Correct the errors below and upload your file again.'});
  }); }
  function preview() {
    setResult({status:'DRY_RUN',items:plan(validation.rows),errors:[]});
    setNotice({tone:'success',text:'Dry run passed. No content was created. Review the plan, then type MIGRATE to confirm.'});
  }
  function start() { run('Migrating', async () => {
    setNotice({tone:'info',text:'Migration in progress. Keep this app open until it finishes.'});
    const migrated=await migrate(validation.rows); setResult(migrated); setConfirmation('');
    setNotice({tone:migrated.status==='COMPLETED'?'success':'error',text:migrated.status==='COMPLETED'?'Migration completed successfully. Review the created records below.':'Migration finished with errors. Review the results before trying again.'});
  }); }
  function prepareExport() { run('Exporting', async () => {
    setNotice({tone:'info',text:'Exporting articles from this Zendesk instance…'});
    const output=await exportCsv(); setExported(output);
    setNotice({tone:'success',text:`Export ready — ${output.articles} articles. Download CSV is available below if the automatic download does not start.`});
    // Keep the URL alive for the visible, user-initiated download and retries.
    const link=document.createElement('a'); link.href=output.url; link.download=output.filename;
    document.body.appendChild(link); link.click(); link.remove();
  }); }
  function switchMode(next) {
    setMode(next);
    setNotice({tone:'info',text:next==='export'?'Export the current instance, then download the CSV.':valid?'Your validated CSV is ready. Review the dry run before migration.':'Upload a CSV to begin. Validate it, then run a dry run before migration.'});
  }
  return <main className="workspace">
    <header className="workspace-header">
      <img src="./cx-experts-logo.png" alt="CX Experts" />
      <div><h1>Article Migrate</h1><p>Zendesk Help Center · Export and import articles</p></div>
    </header>
    <nav className="workspace-tabs" aria-label="Migration mode">
      <button aria-pressed={mode==='import'} disabled={!!busy} onClick={()=>switchMode('import')}>Import articles</button>
      <button aria-pressed={mode==='export'} disabled={!!busy} onClick={()=>switchMode('export')}>Export from instance</button>
    </nav>
    <section ref={scrollArea} className="workspace-scroll" aria-label="Migration workspace" tabIndex={0}>
      <div className={`notice ${notice.tone}`} role={notice.tone==='error'?'alert':'status'} aria-live="polite">{notice.text}</div>
      {mode==='export' ? <section className="workspace-card">
        <h2>Export current Help Center</h2><p>Prepare a CSV of the categories, sections, and articles in this instance. Import it in your destination instance.</p>
        <div className="action-row">
          <button className="primary-button" disabled={!!busy} onClick={prepareExport}>{busy==='Exporting'?'Exporting…':exported?'Refresh export':'Export Help Center CSV'}</button>
          {exported && <a className="secondary-button download-button" href={exported.url} download={exported.filename}>Download CSV</a>}
        </div>
        {exported && <p className="export-summary">{exported.categories} categories · {exported.sections} sections · {exported.articles} articles. Your file stays available until you refresh the export or close the app.</p>}
      </section> : <>
        <section className="workspace-card upload-card">
          <div className="upload-summary"><h2>1. Upload your CSV</h2><p>{file ? file.name : 'Choose a completed template or an export from another instance.'}</p></div>
          <input ref={input} type="file" id="csv-file" accept=".csv,text/csv" hidden disabled={!!busy} onChange={e=>selectFile(e.target.files?.[0])}/>
          <div className="compact-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();selectFile(e.dataTransfer.files[0]);}}>
            <span>{file?'File selected. You can replace it here.':'Drop a CSV here, or use Upload CSV.'}</span>
            <button className="secondary-button" disabled={!!busy} onClick={()=>input.current.click()}>{file?'Replace CSV':'Upload CSV'}</button>
          </div>
        </section>
        {validation && <section className="workspace-card">
          <h2>{valid?'Validation passed':'Validation errors'}</h2>
          {validation.errors.map((error,index)=><p className="validation-error" key={index}>{error.row?`Row ${error.row}: `:''}{error.message}</p>)}
          {validation.warnings.map((warning,index)=><p key={index}>{warning.row?`Row ${warning.row}: `:''}{warning.message}</p>)}
          {valid && <><p>{validation.preview.length} categories · {validation.preview.reduce((sum,c)=>sum+c.sections.length,0)} sections · {validation.rows.length} articles</p>
            <details><summary>Preview article hierarchy</summary>{validation.preview.map(category=><div className="hierarchy" key={category.key}><strong>{category.name}</strong>{category.sections.map(section=><div key={section.key}>{section.name}<ul>{section.articles.map(article=><li key={article.key}>{article.title} <small>{article.status} · {article.locale}</small></li>)}</ul></div>)}</div>)}</details></>}
        </section>}
        {result && <section className="workspace-card"><h2>{dryRun?'Dry-run plan': 'Migration results'}</h2>
          <p>Migration status: {result.status}</p>
          {result.errors?.map((error,index)=><p key={index}>{error.message}</p>)}
          <div className="result-list">{result.items.map((item,index)=><div className="result-item" key={index}><span>{item.type}</span><strong>{item.name}</strong><span className={`status-pill ${item.status}`}>{item.status}</span><span>{item.error || (item.destinationId?`ID ${item.destinationId}`:'')}</span></div>)}</div>
        </section>}
        <TemplateCard/>
      </>}
    </section>
    {mode==='import' && <footer className="workflow-controls" aria-label="Import actions">
      <div className="workflow-buttons"><button className="primary-button" disabled={!file || !!busy} onClick={check}>{busy==='Validating'?'Validating…':'Validate CSV'}</button>
        <button className="secondary-button" disabled={!valid || !!busy} onClick={preview}>Run Dry Run</button></div>
      <div className="migration-confirm"><label htmlFor="confirm">{dryRun?'Type MIGRATE to create content':'Run a dry run before confirming migration'}</label>
        <div><input id="confirm" placeholder="MIGRATE" value={confirmation} disabled={!dryRun || !!busy} onChange={e=>setConfirmation(e.target.value)}/>
        <button className="danger-button" disabled={!valid || !dryRun || confirmation!=='MIGRATE' || !!busy} onClick={start}>{busy==='Migrating'?'Migrating…':'Start Migration'}</button></div>
      </div>
    </footer>}
  </main>;
}
