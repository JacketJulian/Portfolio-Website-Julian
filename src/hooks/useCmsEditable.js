import { useContext } from 'react';
import CmsEditingContext from '../components/DeveloperMode/CmsEditingContext';

// Attach editing to the actual component root; public pages stay untouched.
export default function useCmsEditable({ type, theme, item, label, editable = true, inert = false }) {
  const editing = useContext(CmsEditingContext);
  const canModify = Boolean(editable && editing?.onModify && !editing.dragging && !inert && (item?.id || item?.sourceId));
  const props = { 'data-cms-id': item?.id || item?.sourceId || undefined };
  if (canModify) {
    const select = (event) => {
      let field = event.target.closest?.('[data-cms-field]')?.dataset.cmsField;
      if (type === 'about' && theme === 'target' && field === 'image' && window.innerWidth <= 768) field = 'mobileImage';
      if (field) editing.onModify(type, item, { field });
      else editing.onModify(type, item);
    };
    Object.assign(props, {
      role: 'button',
      tabIndex: 0,
      'aria-label': `Edit ${label || item.title || item.companyName || item.institutionName || type}`,
      'data-cms-theme': theme,
      onClickCapture: (event) => {
        event.preventDefault();
        event.stopPropagation();
        select(event);
      },
      onKeyDownCapture: (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) select(event);
      },
      onDragStartCapture: (event) => event.preventDefault(),
    });
  }
  return { canModify, props, className: canModify ? 'cms-editable' : '' };
}
