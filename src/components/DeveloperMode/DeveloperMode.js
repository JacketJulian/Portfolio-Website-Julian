import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../Button/Button';
import TgtButton from '../tgt_button/tgt_button';
import SectionTitle from '../SectionTitle/SectionTitle';
import PortfolioItem from '../PortfolioItem/PortfolioItem';
import { collectionForType, createCmsDraft, sanitizeDrafts } from '../../utils/cmsDrafts';
import { getAboutContent } from '../../utils/cmsAbout';
import useCmsDrag from './useCmsDrag';
import './DeveloperMode.css';

const types = [
  { type: 'about', label: 'About', zone: 'about', singleton: true },
  { type: 'project', label: 'Projects', singular: 'project', zone: 'projects' },
  { type: 'experience', label: 'Experience', singular: 'experience', zone: 'experience' },
  { type: 'education', label: 'Education', singular: 'education', zone: 'education' },
];

const fields = {
  project: [['title', 'Project name'], ['description', 'Description', 'textarea'], ['image', 'Image URL'], ['demoLink', 'Project URL'], ['videoUrl', 'Video URL'], ['githubLink', 'GitHub URL'], ['liveDemoText', 'Link label']],
  experience: [['companyName', 'Company'], ['jobTitle', 'Role'], ['date', 'Dates'], ['location', 'Location'], ['logo', 'Logo URL'], ['techStack', 'Skills, separated by commas', 'skills']],
  education: [['institutionName', 'Institution'], ['degree', 'Degree or certification'], ['date', 'Dates'], ['location', 'Location'], ['logo', 'Logo URL']],
};

const aboutFields = (theme) => [
  ['name', 'Name or headline'], ['description', 'About description', 'textarea'],
  ['image', theme === 'target' ? 'Desktop banner URL' : 'Portrait image URL'],
  ...(theme === 'target' ? [['mobileImage', 'Mobile banner URL (blank uses desktop)']] : [['imageAlt', 'Image description']]),
  ['resumeLink', 'Resume URL'], ['downloadText', 'Resume button label'],
];

const itemName = (item) => item.title || item.companyName || item.institutionName || 'Untitled';
const saveMessages = { idle: 'Local drafts · this browser', saved: 'Saved in this browser', error: 'Not saved — browser storage unavailable' };

function SignInLink({ theme }) {
  return theme === 'target'
    ? <a className="tgt-button tgt-button--secondary" href="/admin">Sign in again</a>
    : <Button variant="secondary" href="/admin">Sign in again</Button>;
}

// Scale the actual component to the available shelf space; never draw a lookalike.
function ComponentPreview({ type, theme, item, ...dragProps }) {
  const stageRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const educationWidth = viewportWidth <= 768 ? Math.max(280, viewportWidth - 32) : viewportWidth <= 1100 ? 740 : 1160;
  const width = theme === 'target' ? { project: 234, experience: 240, education: educationWidth }[type] : type === 'project' ? 430 : 520;
  useEffect(() => {
    const resize = () => {
      const stage = stageRef.current;
      const content = contentRef.current;
      if (!stage || !content) return;
      setScale(Math.min(1, stage.clientWidth / width, stage.clientHeight / Math.max(content.offsetHeight, 1)));
    };
    resize();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(resize);
    observer.observe(stageRef.current);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [type, theme, width]);
  return <div ref={stageRef} className="cms-component-stage">
    <div className="cms-component-scale" style={{ '--cms-preview-width': `${width}px`, '--cms-preview-scale': scale }} {...dragProps}>
      <div inert={true} ref={contentRef} className="cms-component-content"><PortfolioItem type={type} theme={theme} item={item} editable={false} /></div>
    </div>
  </div>;
}

// Keep comma input as text until blur; normalizing on every keystroke eats separators.
function SkillsField({ value, onChange }) {
  const [text, setText] = useState((value || []).join(', '));
  return <input className="form-control" value={text} onChange={(event) => setText(event.target.value)} onBlur={() => onChange(text.split(',').map((skill) => skill.trim()).filter(Boolean))} />;
}

function DraftEditor({ type, theme, item, onChange }) {
  return <div className="cms-fields">
    {(type === 'about' ? aboutFields(theme) : fields[type]).map(([key, label, kind]) => <label key={key} className={kind === 'textarea' || kind === 'skills' ? 'cms-field cms-field-wide' : 'cms-field'}>
      <span>{label}</span>
      {kind === 'skills' ? <SkillsField key={item.id} value={item[key]} onChange={(value) => onChange(type, item.id, key, value)} /> : kind === 'textarea' ?
        <textarea data-cms-field={key} className="form-control" rows={2} value={item[key] || ''} onChange={(event) => onChange(type, item.id, key, event.target.value)} /> :
        <input data-cms-field={key} className="form-control" value={item[key] || ''} onChange={(event) => onChange(type, item.id, key, event.target.value)} />}
    </label>)}
  </div>;
}

export default function DeveloperMode({
  theme, drafts, onDraftChange, onDeleteDraft, onDragStateChange, onHoverZoneChange,
  onPlace, onNavigateToSection, isOpen, onOpenChange, saveStatus, editRequest,
  aboutContent = getAboutContent(theme),
  mode = 'local', isDirty = false, publishStatus = 'idle', publishError = '',
  logoutError = '', version = '', onPublish, onLogout, sessionEmail, accessError,
}) {
  const [activeType, setActiveType] = useState('project');
  const [selectedId, setSelectedId] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const trayRef = useRef(null);
  const launcherRef = useRef(null);
  const editorRef = useRef(null);
  const bodyRef = useRef(null);
  const themedButton = theme === 'target' ? TgtButton : Button;
  const Action = themedButton;
  const category = types.find((entry) => entry.type === activeType);
  const items = (drafts[collectionForType(activeType)] || []).filter((item) => activeType !== 'about' || item.sourceId === aboutContent.sourceId);
  const selected = items.find((item) => item.id === selectedId) || items[items.length - 1] || (activeType === 'about' ? aboutContent : null);
  const templates = useMemo(() => Object.fromEntries(types.filter((entry) => !entry.singleton).map(({ type }) => [type, createCmsDraft(type)])), []);

  const place = (type, zone) => {
    const created = onPlace(type, zone);
    if (!created) return;
    setActiveType(type);
    setSelectedId(created.id);
    setAnnouncement(`New ${type} added. Edit its details below.`);
    onNavigateToSection(zone, created.id);
    requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.scrollTop = 0;
      if (window.innerWidth <= 700 && bodyRef.current && editorRef.current) {
        const body = bodyRef.current;
        body.scrollTo({ top: editorRef.current.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop, behavior: 'smooth' });
      }
    });
  };
  const { beginDrag, cancelDrag, drag } = useCmsDrag({
    isOpen, theme, onDragStateChange, onHoverZoneChange, onPlace: place, onNavigateToSection,
  });

  useEffect(() => {
    if (!editRequest || !collectionForType(editRequest.type)) return;
    cancelDrag();
    setActiveType(editRequest.type);
    setSelectedId(editRequest.id);
    setAnnouncement(`Modifying ${editRequest.type}. Changes appear live on the page.`);
  }, [editRequest, cancelDrag]);

  useEffect(() => {
    if (!isOpen || !editRequest || activeType !== editRequest.type || selected?.id !== editRequest.id) return undefined;
    const frame = requestAnimationFrame(() => {
      const editor = editorRef.current;
      const body = bodyRef.current;
      if (!editor) return;
      editor.scrollTop = 0;
      if (body && window.innerWidth <= 700) {
        body.scrollTop += editor.getBoundingClientRect().top - body.getBoundingClientRect().top;
      }
      const field = [...editor.querySelectorAll('.cms-fields [data-cms-field]')].find((input) => input.dataset.cmsField === editRequest.field)
        || editor.querySelector('.cms-fields input');
      field?.focus({ preventScroll: true });
      // Scroll only the tray, never the live page, to reveal a clicked image's field.
      if (field) {
        const scroller = window.innerWidth <= 700 ? body : editor;
        if (scroller) scroller.scrollTop += field.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 36;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, editRequest, activeType, selected?.id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      // The first Escape cancels a drag; otherwise collapse the tray.
      if (drag) return;
      onOpenChange(false);
      requestAnimationFrame(() => launcherRef.current?.querySelector('button')?.focus());
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onOpenChange, drag]);

  useEffect(() => {
    if (isOpen) trayRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  const selectType = (type) => {
    cancelDrag();
    setActiveType(type);
    setSelectedId('');
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    onNavigateToSection(collectionForType(type));
  };

  const close = () => {
    cancelDrag();
    onOpenChange(false);
    requestAnimationFrame(() => launcherRef.current?.querySelector('button')?.focus());
  };

  const downloadDraft = () => {
    const payload = { content: sanitizeDrafts(drafts) };
    if (version) payload.version = version;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio-draft${version ? `-v${version}` : ''}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setAnnouncement('Draft downloaded.');
  };

  const requestLogout = () => {
    if (isDirty && !window.confirm('You have unpublished changes. Publish or download your draft before logging out. Log out anyway?')) return;
    onLogout();
  };

  const productionStatus = logoutError
    ? `${isDirty ? 'Unpublished changes' : 'Published'} · log out failed`
    : publishStatus === 'publishing'
    ? 'Unpublished changes · publishing…'
    : publishStatus === 'conflict'
      ? 'Unpublished changes · publishing conflict'
      : publishStatus === 'expired'
        ? 'Unpublished changes · session expired'
        : publishStatus === 'error'
          ? 'Unpublished changes · publish failed'
          : isDirty ? 'Unpublished changes' : 'Published';
  const statusMessage = mode === 'production' ? productionStatus : (saveMessages[saveStatus] || saveMessages.idle);

  if (accessError) {
    return createPortal(<div className="cms-launcher cms-access-error" data-cms-theme={theme} role="alert">
      <span>Portfolio editor unavailable.</span>
      <SignInLink theme={theme} />
    </div>, document.body);
  }

  const launch = <div ref={launcherRef} className="cms-launcher" data-cms-theme={theme}>
    <Action type="button" aria-label="Open portfolio editor" onClick={() => onOpenChange(true)}>Edit portfolio</Action>
  </div>;

  return createPortal(<>
    {!isOpen && launch}
    {isOpen && <section ref={trayRef} tabIndex={-1} data-cms-tray data-cms-theme={theme} className="cms-tray" aria-label="Portfolio editor">
      <header className="cms-tray-header">
        <div className="cms-tray-title"><SectionTitle level={2} color="#1d1d1f">Edit portfolio.</SectionTitle><span role="status">{statusMessage}</span>{mode === 'production' && sessionEmail && <span className="cms-session-email">{sessionEmail}</span>}</div>
        <div className="cms-controls" aria-label="Content type">
          {types.map(({ type, label }) => <Action type="button" key={type} variant={type === activeType ? 'primary' : 'secondary'} aria-pressed={type === activeType} onClick={() => selectType(type)}>{label}</Action>)}
        </div>
        <div className="cms-header-actions">
          {mode === 'production' && <>
            <Action type="button" onClick={onPublish} disabled={!isDirty || publishStatus === 'publishing'}>{publishStatus === 'publishing' ? 'Publishing…' : 'Publish'}</Action>
            {isDirty && <Action type="button" variant="secondary" onClick={downloadDraft}>Download draft</Action>}
            <Action type="button" variant="secondary" title={isDirty ? 'Publish or download your draft before logging out.' : undefined} onClick={requestLogout}>Log out</Action>
          </>}
          <Action type="button" variant="secondary" onClick={close} aria-label="Close portfolio editor">Done</Action>
        </div>
      </header>

      {mode === 'production' && ['conflict', 'expired', 'error'].includes(publishStatus) && <div className="cms-publish-alert" role="alert">
        <span>{publishStatus === 'conflict' ? 'Your edits have not been published. Download your draft before reloading to review the latest published content.' : publishStatus === 'expired' ? 'Your session expired. Download your draft before signing in again so your unpublished edits are not lost.' : (publishError || 'Publishing failed. Your edits are still in this tab.')}</span>
        {['conflict', 'expired'].includes(publishStatus) && <div className="cms-publish-alert-actions">
          {isDirty && <Action type="button" variant="secondary" onClick={downloadDraft}>Download draft</Action>}
          {publishStatus === 'expired' && <SignInLink theme={theme} />}
        </div>}
      </div>}
      {mode === 'production' && logoutError && <div className="cms-publish-alert" role="alert">Log out failed: {logoutError} The editor and your drafts remain open.</div>}

      <div ref={bodyRef} className="cms-tray-body">
        <aside className={`cms-library${category.singleton ? ' cms-library-about' : ''}`}>
          <div className="cms-library-caption"><strong>{category.singleton ? 'About content' : `Drag a new ${category.singular}`}</strong><button className="cms-text-button" type="button" onClick={() => onNavigateToSection(category.zone)}>Show section ↑</button></div>
          {category.singleton ? <div className="cms-empty cms-about-help">
            <SectionTitle level={3} color="#1d1d1f">Your About section.</SectionTitle>
            <p>Click the text or image on the page above, or edit its fields here.</p>
            <p>{theme === 'target' ? 'Desktop and mobile banners have their own image URLs. Leave mobile blank to reuse the desktop banner.' : 'The portrait image is shared by the desktop and mobile Apple layouts.'}</p>
            <p className="cms-note">Changes apply only to the {theme === 'target' ? 'Target' : 'Apple'} variant{mode === 'local' ? ' and stay in this browser.' : ' until you publish them.'}</p>
            <Action type="button" variant="secondary" onClick={() => onNavigateToSection('about', undefined, 'image')}>Show image ↑</Action>
          </div> : <>
          <ComponentPreview type={activeType} theme={theme} item={templates[activeType]}
              role="button" tabIndex={0} aria-label={`Drag new ${category.singular} onto ${category.label}`}
              onPointerDown={(event) => beginDrag(event, activeType)} onDragStart={(event) => event.preventDefault()}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); place(activeType, category.zone); } }} />
          <div className="cms-library-actions"><Action type="button" onClick={() => place(activeType, category.zone)}>Add {category.singular}</Action><span>Drag to add. Click an item above to edit.</span></div>
          </>}
        </aside>

        <div className="cms-editor" ref={editorRef}>
          {selected ? <>
            <div className="cms-editor-heading">
              {category.singleton ? <SectionTitle level={3} color="#1d1d1f">{theme === 'target' ? 'Target' : 'Apple'} About</SectionTitle> :
                <label className="cms-draft-select"><span>{category.label} drafts</span><select className="form-select" aria-label="Choose draft to edit" value={selected.id} onChange={(event) => { setSelectedId(event.target.value); onNavigateToSection(category.zone, event.target.value); }}>{[...items].reverse().map((item) => <option key={item.id} value={item.id}>{itemName(item)}{item.sourceId ? ' (modified)' : ''}</option>)}</select></label>}
              <Action type="button" variant="secondary" disabled={!selected.id} onClick={() => {
                onDeleteDraft(activeType, selected.id);
                setSelectedId('');
                setAnnouncement(selected.sourceId ? 'Original item restored.' : 'Draft removed.');
              }}>{selected.sourceId ? 'Reset changes' : 'Remove draft'}</Action>
            </div>
            {selected.sourceId && <p className="cms-modification-note">Editing an existing item in place. Reset changes restores the original.</p>}
            <DraftEditor key={category.singleton ? `about-${theme}` : selected.id} type={activeType} theme={theme} item={selected} onChange={onDraftChange} />
          </> : <div className="cms-empty"><SectionTitle level={3} color="#1d1d1f">Your next {category.singular} starts here.</SectionTitle><p>Drop the component into {category.label} to add it, then edit its details here.</p><p className="cms-note">{mode === 'local' ? 'Local preview only. Drafts stay in this browser; they do not change your source files or published site.' : 'Changes stay unpublished until you choose Publish.'}</p></div>}
        </div>
      </div>
      <div className="visually-hidden" aria-live="polite">{announcement}</div>
    </section>}
    {drag?.active && <div className="cms-drag-ghost" data-cms-theme={theme} style={{ left: drag.x + 16, top: drag.y + 16 }} aria-hidden="true"><ComponentPreview type={drag.type} theme={theme} item={templates[drag.type]} /></div>}
  </>, document.body);
}

// The visible placeholder is rendered INSIDE each collection by that collection's
// real item component. This wrapper supplies hit testing only, with no fake card.
export function CmsDropTarget({ zone, accepts, children, theme }) {
  return <div data-cms-zone={zone} data-cms-accepts={accepts.join(' ')} data-cms-theme={theme} className="cms-live-region">{children}</div>;
}
