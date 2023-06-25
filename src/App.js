import React from 'react';
import isMobile from 'is-mobile';

import Mobile from './Mobile';
import Train from './Train';
import './App.scss';

function App() {
    return(
        isMobile() ? <Mobile/> : <Train/>
    );
}

export default App;