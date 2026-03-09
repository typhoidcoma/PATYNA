import './styles/global.css';
import { App } from './app.ts';

const container = document.getElementById('app');
if (!container) throw new Error('Missing #app container');

// Remove inline loading spinner (rendered by index.html before JS loads)
document.getElementById('app-loading')?.remove();

new App(container);
