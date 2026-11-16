<script lang="ts">
  import {onMount} from 'svelte';import Icon from './Icon.svelte';
  export let title:string;export let onclose:()=>void;let dialog:HTMLDialogElement;
  onMount(()=>{dialog.showModal();return ()=>dialog.close();});
</script>
<dialog bind:this={dialog} oncancel={(e)=>{e.preventDefault();onclose();}} class="modal"><header><h2>{title}</h2><button class="icon-button" aria-label="Close dialog" onclick={onclose}><Icon name="close"/></button></header><div class="modal-content"><slot/></div></dialog>