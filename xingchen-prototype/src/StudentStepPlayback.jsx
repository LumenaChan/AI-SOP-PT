import React, { useEffect, useRef, useState } from 'react';
export function StepPlaybackVideo({ clip, videoRef, speed, verify, onError }) {
  return <video ref={videoRef} controls playsInline preload="metadata" src={clip.url} poster={clip.poster} aria-label={`本人操作回放：${clip.label}`}
    onLoadedMetadata={e => { const p = e.currentTarget; if (!verify(p)) return; if (Number.isFinite(p.duration) && p.duration <= clip.start) { onError('录像长度不足，无法定位本步骤片段。'); return; } p.currentTime = clip.start || 0; p.playbackRate = speed; }}
    onTimeUpdate={e => { const p = e.currentTarget; if (!verify(p)) return; if (clip.end != null && p.currentTime >= clip.end) p.pause(); }}
    onSeeking={e => { const p = e.currentTarget; if (!verify(p)) return; if (p.currentTime < clip.start) p.currentTime = clip.start; if (clip.end != null && p.currentTime > clip.end) p.currentTime = clip.end; }}
    onPlay={e => { const p = e.currentTarget; if (!verify(p)) return; if (p.currentTime < clip.start || (clip.end != null && p.currentTime >= clip.end)) p.currentTime = clip.start; }}
    onError={() => onError('本片段暂时无法播放，请稍后重试或联系教师核对录像。')} />;
}
export function StudentStepPlayback({ playback }) {
  const [selected, setSelected] = useState(playback.clips[0]?.id);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(playback.defaultExpanded === true);
  const [speed, setSpeed] = useState(1);
  const video = useRef(null);
  const clip = playback.clips.find(c => c.id === selected) || playback.clips[0];
  useEffect(() => { setError(''); }, [clip?.id, clip?.url]);
  const expired = () => [playback.expiresAt, clip?.expiresAt].some(at => Number.isFinite(at) && Date.now() >= at);
  const verify = player => {
    if (!expired()) return true;
    player.pause(); setError('录像已超过保留期限，评分说明和教师反馈仍可查看。'); return false;
  };
  return <section className="student-step-playback"><h3>操作录像</h3><p>{playback.message}</p>
    {clip && <details open={playback.defaultExpanded === true} onToggle={e => { const open = e.currentTarget.open; if (!open) video.current?.pause(); setExpanded(open); }}>
      <summary>查看操作片段</summary>
      {expanded && <div className="student-step-player">
        {playback.clips.length > 1 && <label>选择视角<select value={clip.id} onChange={e => { video.current?.pause(); setSelected(e.target.value); }}>{playback.clips.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
        {error ? <p role="status">{error}</p> : <StepPlaybackVideo key={`${clip.id}-${clip.url}`} clip={clip} videoRef={video} speed={speed} verify={verify} onError={setError} />}
        <label>播放速度<select value={speed} onChange={e => { const value = Number(e.target.value); setSpeed(value); if (video.current) video.current.playbackRate = value; }}><option value="0.5">0.5倍速</option><option value="1">正常速度</option><option value="1.5">1.5倍速</option><option value="2">2倍速</option></select></label>
      </div>}
    </details>}
  </section>;
}
