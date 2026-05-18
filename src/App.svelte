<script>
  import { onMount } from 'svelte';
  import DrumPatternNN from './neuralNetwork.js';
  import * as drumPatterns from '../drum_patterns.js';
  import StrudelEditor from './lib/StrudelEditor.svelte';

  // State using Svelte 5 Runes
  let nn = $state(null);
  let patterns = $state([]);
  let populationSize = $state(8);

  // Extract all pattern codes from the exported module
  function extractPatterns() {
    return Object.values(drumPatterns).filter(p => typeof p === 'string');
  }

  // Initialize the neural network with seed patterns
  function initNN() {
    const seedPatterns = extractPatterns();
    nn = new DrumPatternNN();
    nn.initialize(seedPatterns.slice(0, 20)); // Start with first 20 patterns
    generateNewGeneration();
  }

  // Generate a new generation of patterns
  function generateNewGeneration() {
    if (!nn) return;
    
    try {
      const evolved = nn.evolve(populationSize, 0.4);
      patterns = evolved.map(code => ({
        code,
        rating: null,
        isPlaying: false,
      }));
      currentStep = {};
    } catch (error) {
      console.error('Error evolving patterns:', error);
    }
  }

  // Rate a pattern
  function ratePattern(index, rating) {
    if (!nn || !patterns[index]) return;
    patterns[index].rating = parseInt(rating);
    nn.ratePattern(patterns[index].code, parseInt(rating));
  }
  
  // Toggle play/pause for a pattern (using Strudel editor)
  function togglePlay(index) {
    if (!patterns[index]) return;
    patterns[index].isPlaying = !patterns[index].isPlaying;
  }
  
  // Stop all patterns
  function stopAll() {
    patterns.forEach((p, idx) => {
      if (p.isPlaying) {
        p.isPlaying = false;
      }
    });
  }

  onMount(() => {
    initNN();
    
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  });
</script>

<main>
  <h1>🥁 AI Drum Pattern Generator</h1>
  
  <div class="controls">
    <div class="control-group">
      <label for="population">Patterns per Generation:</label>
      <input 
        type="number" 
        id="population" 
        bind:value={populationSize} 
        min="4" 
        max="20"
      />
    </div>
    
    <div class="generation-info">
      <span>Generation: {nn?.getGeneration() || 0}</span>
    </div>
    
    <button class="evolve-btn" onclick={generateNewGeneration}>
      🧬 Evolve New Generation
    </button>
  </div>
  
  <div class="patterns-grid">
    {#each patterns as pattern, index}
      <div class="pattern-card">
        <div class="pattern-header">
          <h3>Pattern {index + 1}</h3>
          <button 
            class="play-btn {pattern.isPlaying ? 'playing' : ''}"
            onclick={() => togglePlay(index)}
          >
            {pattern.isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
        </div>
        
        <StrudelEditor code={pattern.code} isPlaying={pattern.isPlaying} />
        
        <div class="rating-section">
          <label for="rating-{index}">Rate: {pattern.rating || '?'}/10</label>
          <input 
            type="range" 
            id="rating-{index}"
            min="1" 
            max="10" 
            value={pattern.rating || 5}
            oninput={(e) => ratePattern(index, e.target.value)}
          />
          <div class="rating-display">
            {#each Array.from({ length: 10 }, (_, i) => i) as i}
              <span class="star {i < (pattern.rating || 0) ? 'filled' : ''}">★</span>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
  
  <div class="instructions">
    <h2>How to Use</h2>
    <ol>
      <li>Listen to each drum pattern by clicking the Play button</li>
      <li>Rate each pattern from 1-10 based on your preference</li>
      <li>Click "Evolve New Generation" to create new patterns based on your ratings</li>
      <li>The AI will learn from your preferences and generate increasingly better patterns</li>
    </ol>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    min-height: 100vh;
    color: #eee;
  }
  
  main {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  h1 {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 2rem;
    background: linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .controls {
    display: flex;
    gap: 2rem;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    backdrop-filter: blur(10px);
  }
  
  .control-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .control-group input {
    width: 60px;
    padding: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 1rem;
  }
  
  .generation-info {
    font-size: 1.2rem;
    font-weight: bold;
    color: #48dbfb;
  }
  
  .evolve-btn {
    padding: 0.75rem 2rem;
    font-size: 1.1rem;
    font-weight: bold;
    background: linear-gradient(90deg, #ff6b6b, #feca57);
    border: none;
    border-radius: 8px;
    color: #1a1a2e;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .evolve-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
  }
  
  .patterns-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }
  
  .pattern-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .pattern-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
  
  .pattern-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .pattern-header h3 {
    margin: 0;
    color: #feca57;
  }
  
  .play-btn {
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    border: none;
    border-radius: 6px;
    background: linear-gradient(90deg, #48dbfb, #0abde3);
    color: #1a1a2e;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
  }
  
  .play-btn:hover {
    transform: scale(1.05);
  }
  
  .play-btn.playing {
    background: linear-gradient(90deg, #ff6b6b, #ee5a6f);
  }
  
  .rating-section {
    margin-top: 1rem;
  }
  
  .rating-section label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
    color: #feca57;
  }
  
  .rating-section input[type="range"] {
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.2);
    outline: none;
    -webkit-appearance: none;
  }
  
  .rating-section input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(90deg, #ff6b6b, #feca57);
    cursor: pointer;
  }
  
  .rating-display {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.5rem;
    justify-content: center;
  }
  
  .star {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.2);
  }
  
  .star.filled {
    color: #feca57;
  }
  
  .instructions {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .instructions h2 {
    color: #48dbfb;
    margin-top: 0;
  }
  
  .instructions ol {
    line-height: 2;
    font-size: 1.1rem;
  }
  
  @media (max-width: 768px) {
    .patterns-grid {
      grid-template-columns: 1fr;
    }
    
    .controls {
      flex-direction: column;
      gap: 1rem;
    }
  }
</style>
