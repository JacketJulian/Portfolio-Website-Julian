import { createContext } from 'react';

// A null provider leaves public pages and standalone previews non-editable.
export default createContext(null);
