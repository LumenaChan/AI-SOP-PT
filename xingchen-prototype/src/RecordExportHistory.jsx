import React, { useEffect, useState } from 'react';
import { exportAvailability, storedExportDownload } from './exportFileRules.js';
import { displayBusinessText } from './businessTextRules.js';
export function RecordExportHistory({ jobs, onDownload, onExport }) {
  const [now, setNow] = useState(Date.now);
  const [error, setError] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  if (!jobs.length) return null;
  return <section className="panel record-export-history">
    <header className="panel-title"><h2>导出记录</h2><span>文件保留7天</span></header>
    <div className="export-list">{jobs.map(job => {
      const state = exportAvailability(job, now);
      return <article key={job.id}>
        <div><strong>{job.fileName}</strong><small>{displayBusinessText(job.createdAt)} · {job.scope} · {job.format} · {job.dataScope || '导出时数据'}</small>
          {Number.isFinite(state.expiresAt) && <small>有效期至 {displayBusinessText(new Date(state.expiresAt).toISOString())}</small>}
        </div>
        <span className={`status ${state.downloadable ? 'status--success' : ''}`}>{state.label}</span>
        {state.downloadable && <button className="button button--default" onClick={() => {
          try { const file = storedExportDownload(job); onDownload(file); setError(''); }
          catch (e) { setError(e.message); setNow(Date.now()); }
        }}>下载原文件</button>}
      </article>;
    })}</div>
    <div className="record-export-footer"><span>重新导出将按当前数据生成新记录。</span><button className="button button--default" onClick={onExport}>重新导出安排结果</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
