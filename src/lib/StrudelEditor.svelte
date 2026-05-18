<script>
  import { onMount } from 'svelte';
  import { repl } from '@strudel/core';
  import { initAudioOnFirstClick } from '@strudel/webaudio';
  
  let { code = '', isPlaying = false } = $props();
  let editorContainer;
  let editorInstance = null;
  
  onMount(async () => {
    // Initialize audio on first interaction
    initAudioOnFirstClick();
    
    // Create the Strudel REPL instance
    if (editorContainer) {
      editorInstance = repl({
        target: editorContainer,
        defaultOutput: 'webaudio',
        autoUpdate: false,
      });
      
      // Set initial code
      if (code) {
        editorInstance.setCode(code);
      }
    }
    
    return () => {
      if (editorInstance) {
        editorInstance.stop();
        editorInstance.dispose();
      }
    };
  });
  
  $effect(() => {
    if (!editorInstance) return;
    
    if (code) {
      editorInstance.setCode(code);
    }
    
    if (isPlaying) {
      editorInstance.play();
    } else {
      editorInstance.stop();
    }
  });
</script>

<div class="strudel-wrapper">
  <div class="editor-container" bind:this={editorContainer}></div>
</div>

<style>
  .strudel-wrapper {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .editor-container {
    min-height: 120px;
    background: #0d1117;
  }
  
  /* Override Strudel styles for dark theme */
  :global(.strudel-editor) {
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace !important;
    font-size: 0.85rem !important;
    line-height: 1.6 !important;
  }
</style>
