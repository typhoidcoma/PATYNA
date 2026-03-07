import './styles/global.css';
import { App } from './app.ts';

const container = document.getElementById('app');
if (!container) throw new Error('Missing #app container');

new App(container);
