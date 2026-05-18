// Simple JavaScript Neural Network for Drum Pattern Generation
// Uses a genetic algorithm approach with neural network-inspired mutation

export class DrumPatternNN {
  constructor() {
    this.patterns = [];
    this.ratings = new Map(); // pattern code -> rating
    this.generation = 0;
    
    // Drum sounds vocabulary extracted from patterns
    this.drumSounds = [
      'bd',   // bass drum
      'sd',   // snare drum
      'hh',   // hi-hat closed
      'oh',   // hi-hat open
      'cy',   // cymbal
      'rim',  // rim shot
      'cp',   // clap
      'lt',   // low tom
      'mt',   // mid tom
      'ht',   // high tom
      'ac',   // acoustic
    ];
    
    this.stepSymbols = ['bd', 'sd', 'hh', 'oh', 'cy', 'rim', 'cp', 'lt', 'mt', 'ht', 'ac', '~'];
  }

  // Initialize with seed patterns
  initialize(patterns) {
    this.patterns = [...patterns];
    this.ratings.clear();
    this.generation = 0;
  }

  // Rate a pattern (1-10)
  ratePattern(patternCode, rating) {
    this.ratings.set(patternCode, rating);
  }

  // Get fitness score for a pattern
  getFitness(patternCode) {
    return this.ratings.get(patternCode) || 5; // default to neutral
  }

  // Parse pattern into structure for manipulation
  parsePattern(patternCode) {
    const stackMatch = patternCode.match(/stack\(([\s\S]*?)\)\.s\(\)\.slow\(\d+\)/);
    if (!stackMatch) return null;
    
    const tracksContent = stackMatch[1];
    const tracks = [];
    const trackRegex = /"([^"]+)"/g;
    let match;
    
    while ((match = trackRegex.exec(tracksContent)) !== null) {
      tracks.push(match[1]);
    }
    
    return {
      tracks,
      original: patternCode,
    };
  }

  // Convert parsed pattern back to code
  buildPattern(parsed) {
    const tracksStr = parsed.tracks.map(t => `  "${t}"`).join(',\n');
    return `stack(\n${tracksStr},\n).s().slow(2)`;
  }

  // Mutate a single step in a track
  mutateStep(track, mutationRate = 0.3) {
    const steps = track.split(' ').filter(s => s.length > 0);
    return steps.map(step => {
      if (step === '[' || step === ']') return step;
      
      // Remove brackets for processing
      const cleanStep = step.replace(/[\[\]]/g, '');
      
      if (Math.random() < mutationRate) {
        // Random mutation: replace with random sound or rest
        if (Math.random() < 0.5) {
          const randomSound = this.stepSymbols[Math.floor(Math.random() * this.stepSymbols.length)];
          return `[${randomSound}]`;
        } else {
          // Swap with adjacent step pattern
          return Math.random() < 0.5 ? '[~]' : `[${this.drumSounds[Math.floor(Math.random() * this.drumSounds.length)]}]`;
        }
      }
      return `[${cleanStep}]`;
    }).join(' ');
  }

  // Mutate an entire track
  mutateTrack(track, mutationRate = 0.2) {
    // Extract steps from bracket notation
    const stepMatches = track.match(/\[[^\]]+\]/g);
    if (!stepMatches) return track;
    
    const mutated = stepMatches.map(step => {
      const content = step.slice(1, -1);
      if (content === '~' || Math.random() > mutationRate) {
        return step;
      }
      
      // Mutation options
      const rand = Math.random();
      if (rand < 0.3) {
        // Replace with rest
        return '[~]';
      } else if (rand < 0.6) {
        // Replace with random drum
        const randomDrum = this.stepSymbols[Math.floor(Math.random() * this.stepSymbols.length)];
        return `[${randomDrum}]`;
      } else if (rand < 0.8) {
        // Shift timing (swap with neighbor)
        return '[~]';
      } else {
        // Keep but add variation
        return step;
      }
    });
    
    return mutated.join(' ');
  }

  // Crossover two patterns
  crossover(parent1, parent2) {
    const parsed1 = this.parsePattern(parent1);
    const parsed2 = this.parsePattern(parent2);
    
    if (!parsed1 || !parsed2) return parent1;
    
    // Track-level crossover
    const childTracks = [];
    for (let i = 0; i < Math.max(parsed1.tracks.length, parsed2.tracks.length); i++) {
      const useParent1 = Math.random() < 0.5;
      const parentTrack = useParent1 && parsed1.tracks[i] 
        ? parsed1.tracks[i] 
        : parsed2.tracks[i] || parsed1.tracks[i % parsed1.tracks.length];
      
      childTracks.push(parentTrack);
    }
    
    return this.buildPattern({ tracks: childTracks });
  }

  // Generate new pattern through mutation
  mutate(pattern, mutationRate = 0.15) {
    const parsed = this.parsePattern(pattern);
    if (!parsed) return pattern;
    
    const mutatedTracks = parsed.tracks.map(track => 
      this.mutateTrack(track, mutationRate)
    );
    
    return this.buildPattern({ tracks: mutatedTracks });
  }

  // Enforce diversity by checking similarity
  calculateDiversity(newPattern, existingPatterns, minDifference = 0.3) {
    const newParsed = this.parsePattern(newPattern);
    if (!newParsed) return false;
    
    for (const existing of existingPatterns) {
      const existingParsed = this.parsePattern(existing);
      if (!existingParsed) continue;
      
      // Compare track structures
      let similarity = 0;
      const maxTracks = Math.max(newParsed.tracks.length, existingParsed.tracks.length);
      
      for (let i = 0; i < maxTracks; i++) {
        const newTrack = newParsed.tracks[i] || '';
        const existingTrack = existingParsed.tracks[i] || '';
        
        // Simple character-based similarity
        const matches = newTrack.split('').filter((c, idx) => c === existingTrack[idx]).length;
        const maxLength = Math.max(newTrack.length, existingTrack.length);
        similarity += maxLength > 0 ? matches / maxLength : 0;
      }
      
      const avgSimilarity = similarity / maxTracks;
      if (avgSimilarity > (1 - minDifference)) {
        return false; // Too similar
      }
    }
    
    return true; // Diverse enough
  }

  // Evolve to next generation
  evolve(populationSize = 8, diversityThreshold = 0.4) {
    if (this.patterns.length === 0) {
      throw new Error('No patterns to evolve from. Initialize with patterns first.');
    }
    
    this.generation++;
    
    // Sort patterns by fitness
    const sorted = [...this.patterns].sort((a, b) => 
      this.getFitness(b) - this.getFitness(a)
    );
    
    // Elitism: keep top performers
    const eliteCount = Math.max(2, Math.floor(populationSize * 0.2));
    const elites = sorted.slice(0, eliteCount);
    
    const newPatterns = [...elites];
    const attempts = new Set(elites.map(p => p)); // Track unique patterns
    
    // Generate rest through crossover and mutation
    while (newPatterns.length < populationSize) {
      // Select parents (tournament selection)
      const tournamentSize = 3;
      const candidates1 = sorted.slice(0, Math.min(tournamentSize * 2, sorted.length));
      const candidates2 = sorted.slice(0, Math.min(tournamentSize * 2, sorted.length));
      
      const parent1 = candidates1[Math.floor(Math.random() * candidates1.length)];
      const parent2 = candidates2[Math.floor(Math.random() * candidates2.length)];
      
      // Crossover
      let child = this.crossover(parent1, parent2);
      
      // Mutate
      child = this.mutate(child, 0.2 + Math.random() * 0.2);
      
      // Check diversity
      const isUnique = !attempts.has(child) && 
        this.calculateDiversity(child, Array.from(attempts), diversityThreshold);
      
      if (isUnique) {
        newPatterns.push(child);
        attempts.add(child);
      }
      
      // Prevent infinite loop
      if (attempts.size > populationSize * 10) {
        // Add a completely random variation if stuck
        const randomParent = sorted[Math.floor(Math.random() * sorted.length)];
        const randomChild = this.mutate(randomParent, 0.4);
        if (!attempts.has(randomChild)) {
          newPatterns.push(randomChild);
          attempts.add(randomChild);
        }
      }
    }
    
    // Clear old ratings for new patterns (keep elite ratings as baseline)
    const newRatings = new Map();
    elites.forEach(p => newRatings.set(p, this.ratings.get(p) || 5));
    this.ratings = newRatings;
    
    this.patterns = newPatterns;
    return this.patterns;
  }

  // Get current patterns with their ratings
  getPatternsWithRatings() {
    return this.patterns.map(code => ({
      code,
      rating: this.ratings.get(code) || null,
    }));
  }

  // Get generation number
  getGeneration() {
    return this.generation;
  }
}

export default DrumPatternNN;
