import { Routes, Route } from 'react-router-dom';
import MissionControl from './pages/MissionControl';
import VanguardView from './pages/VanguardView';
import ArgusView from './pages/ArgusView';
import SentinelView from './pages/SentinelView';
import TerminalView from './pages/TerminalView';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MissionControl />} />
      <Route path="/vanguard" element={<VanguardView />} />
      <Route path="/argus" element={<ArgusView />} />
      <Route path="/sentinel" element={<SentinelView />} />
      <Route path="/terminal" element={<TerminalView />} />
    </Routes>
  );
}

export default App;
