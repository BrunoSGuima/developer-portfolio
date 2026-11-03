// What the shell already ships: React alone. R3F's real cost is its build minus this one.
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(<p>React only</p>);
