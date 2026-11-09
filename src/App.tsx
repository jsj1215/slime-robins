import { useState } from 'react';
import { LandingScreen } from './screens/LandingScreen';
import { ShowcaseScreen } from './screens/ShowcaseScreen';
import { PlayScreen } from './screens/PlayScreen';
import type { ResolvedSlime } from './types/slime';

type Screen = 'landing' | 'showcase' | 'play';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [selectedSlime, setSelectedSlime] = useState<ResolvedSlime | null>(null);

  if (screen === 'play' && selectedSlime) {
    return (
      <PlayScreen
        slime={selectedSlime}
        onBack={() => setScreen('showcase')}
      />
    );
  }

  if (screen === 'showcase') {
    return (
      <ShowcaseScreen
        onSelect={(slime) => { setSelectedSlime(slime); setScreen('play'); }}
        onHome={() => setScreen('landing')}
      />
    );
  }

  return <LandingScreen onStart={() => setScreen('showcase')} />;
}
