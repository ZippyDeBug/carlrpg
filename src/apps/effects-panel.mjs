/**
 * Dungeon Crawler Carl RPG — Pathfinder 2e-Style Active Effects & Auras Panel
 *
 * Displays a docked vertical column of active status badges immediately to the left
 * of Foundry's right navigation sidebar (#sidebar).
 * Dynamically binds to the controlled token (or assigned crawler if unselected).
 * Displays active auras (emitters and receivers), buffs, and debuffs with remaining
 * round countdown pills, expandable detail flyout cards, and 1-click dismissal controls.
 */

export class DCCEffectsPanel {
  static instance = null;

  constructor() {
    this.element = null;
    this.activeFlyoutId = null;
  }

  static get defaultOptions() {
    return {
      id: 'dcc-effects-panel',
      template: 'systems/carl-rpg/templates/apps/effects-panel.hbs'
    };
  }

  /**
   * Retrieve or initialize singleton instance.
   * @returns {DCCEffectsPanel}
   */
  static get() {
    if (!DCCEffectsPanel.instance) {
      DCCEffectsPanel.instance = new DCCEffectsPanel();
    }
    return DCCEffectsPanel.instance;
  }

  /**
   * Get the active actor to display effects for.
   * Prioritizes canvas controlled token, falling back to game.user.character.
   * @returns {{ actor: DCCActor|null, token: Token|null }}
   */
  getControlledActor() {
    const controlledToken = globalThis.canvas?.tokens?.controlled?.[0] || null;
    if (controlledToken?.actor) {
      return { actor: controlledToken.actor, token: controlledToken };
    }
    const userCharacter = globalThis.game?.user?.character || null;
    return { actor: userCharacter, token: null };
  }

  /**
   * Collect all active effects affecting the given actor.
   * @param {DCCActor} actor
   * @param {Token} [token=null]
   * @returns {Array<object>}
   */
  collectEffects(actor, token = null) {
    if (!actor) return [];

    const effects = [];
    const itemsList = Array.isArray(actor.items)
      ? actor.items
      : Array.from(actor.items?.values?.() || []);

    // 1. Active Auras Emitted by this Actor
    for (const item of itemsList) {
      const sys = item.system || {};
      const isEmitterType = item.type === 'spell' || item.type === 'buff' || item.type === 'skill';
      if (!isEmitterType || !sys.active) continue;

      const isAura = sys.isAura === true ||
                     sys.area?.hasArea === true ||
                     (Array.isArray(sys.tags) && (sys.tags.includes('spell.aura') || sys.tags.includes('skill.aura'))) ||
                     (typeof item.name === 'string' && item.name.toLowerCase().includes('aura'));

      if (isAura) {
        const remainingRounds = Number(sys.durationConfig?.remainingRounds ?? sys.durationConfig?.rounds ?? 0);
        const durationLabel = remainingRounds > 0 ? `${remainingRounds}r` : (sys.durationConfig?.type === 'permanent' || !sys.durationConfig?.rounds ? '∞' : `${sys.durationConfig?.rounds || 0}r`);
        const fullDurationText = remainingRounds > 0 ? `${remainingRounds} Combat Rounds (${remainingRounds * 10}s remaining)` : 'Permanent / Sustained';

        let detailsText = `${sys.area?.radius || 5}ft radius. Protects allies within burst.`;
        if (actor.system?.attributes?.hp?.tempBars?.source === item.name) {
          detailsText += ` Active: +${actor.system.attributes.hp.tempBars.count} Temp Bars (${actor.system.attributes.hp.tempBars.hpPerSlot} HP/bar).`;
        }

        effects.push({
          id: item.id || item._id,
          itemId: item.id || item._id,
          actorId: actor.id,
          name: item.name,
          img: item.img || 'icons/magic/fire/barrier-shield-fire.webp',
          type: 'aura-emitter',
          typeClass: 'is-aura-emitter',
          typeBadge: '[AURA EMITTER]',
          isAuraEmitter: true,
          isAuraReceiver: false,
          isBuff: false,
          isDebuff: false,
          sourceName: 'Self',
          remainingRounds,
          durationLabel,
          fullDurationText,
          detailsText,
          canDismiss: true,
          sortPriority: 2
        });
      }
    }

    // 2. Active Auras Protecting this Actor as an Ally (Receiver)
    const tempBars = actor.system?.attributes?.hp?.tempBars;
    if (tempBars && Number(tempBars.count) > 0 && tempBars.source) {
      const isSelfEmitter = effects.some(e => e.isAuraEmitter && (e.name === tempBars.source || e.name.toLowerCase() === tempBars.source.toLowerCase()));
      if (!isSelfEmitter) {
        let sourceName = 'Ally';
        let remainingRounds = 0;

        if (typeof canvas !== 'undefined' && canvas?.scene?.templates) {
          const auraTemplates = canvas.scene.templates.filter(t => t.flags?.['carl-rpg']?.isAura);
          for (const tmpl of auraTemplates) {
            const casterId = tmpl.flags?.['carl-rpg']?.actorId;
            const caster = globalThis.game?.actors?.get?.(casterId);
            if (caster) {
              sourceName = caster.name;
              const spellItem = caster.items?.get?.(tmpl.flags?.['carl-rpg']?.auraItemId);
              if (spellItem) {
                remainingRounds = Number(spellItem.system?.durationConfig?.remainingRounds || 0);
              }
              break;
            }
          }
        }

        const durationLabel = remainingRounds > 0 ? `${remainingRounds}r` : '∞';
        const fullDurationText = remainingRounds > 0 ? `${remainingRounds} Combat Rounds (${remainingRounds * 10}s remaining)` : 'Active while in aura burst radius';

        effects.push({
          id: `aura-receiver-${tempBars.source}`,
          name: tempBars.source,
          img: 'icons/magic/fire/barrier-shield-fire.webp',
          type: 'aura-receiver',
          typeClass: 'is-aura-receiver',
          typeBadge: '[AURA PROTECTED]',
          isAuraEmitter: false,
          isAuraReceiver: true,
          isBuff: false,
          isDebuff: false,
          sourceName,
          remainingRounds,
          durationLabel,
          fullDurationText,
          detailsText: `+${tempBars.count} Bonus Health Bars (${tempBars.hpPerSlot} HP/bar) from ${sourceName}'s aura. Absorbs damage first.`,
          canDismiss: false,
          sortPriority: 3
        });
      }
    }

    // 3. Active Debuffs
    for (const item of itemsList) {
      if (item.type !== 'debuff') continue;
      const sys = item.system || {};
      effects.push({
        id: item.id || item._id,
        itemId: item.id || item._id,
        actorId: actor.id,
        name: item.name,
        img: item.img || 'icons/magic/unholy/strike-body-explode-disintegrate.webp',
        type: 'debuff',
        typeClass: 'is-debuff',
        typeBadge: '[DEBUFF]',
        isAuraEmitter: false,
        isAuraReceiver: false,
        isBuff: false,
        isDebuff: true,
        sourceName: 'Hostile',
        remainingRounds: 0,
        durationLabel: sys.duration || 'Combat',
        fullDurationText: sys.duration || 'Until Cleansed',
        detailsText: sys.description || 'Inflicts penalty or damage.',
        canDismiss: Boolean(globalThis.game?.user?.isGM),
        sortPriority: 1
      });
    }

    // 4. Active Buffs (Non-Aura)
    for (const item of itemsList) {
      if (item.type !== 'buff') continue;
      const sys = item.system || {};
      if (!sys.active) continue;
      if (effects.some(e => e.itemId === (item.id || item._id))) continue;

      const remainingRounds = Number(sys.durationConfig?.remainingRounds ?? sys.durationConfig?.rounds ?? 0);
      const durationLabel = remainingRounds > 0 ? `${remainingRounds}r` : (sys.duration || '∞');

      effects.push({
        id: item.id || item._id,
        itemId: item.id || item._id,
        actorId: actor.id,
        name: item.name,
        img: item.img || 'icons/magic/control/buff-strength-muscle-orange.webp',
        type: 'buff',
        typeClass: 'is-buff',
        typeBadge: '[BUFF]',
        isAuraEmitter: false,
        isAuraReceiver: false,
        isBuff: true,
        isDebuff: false,
        sourceName: sys.source || 'Self',
        remainingRounds,
        durationLabel,
        fullDurationText: sys.duration || 'Active',
        detailsText: sys.description || 'Grants enhancement.',
        canDismiss: true,
        sortPriority: 4
      });
    }

    // Sort: Debuffs (1) -> Aura Emitters (2) -> Aura Receivers (3) -> Buffs (4)
    effects.sort((a, b) => (a.sortPriority || 99) - (b.sortPriority || 99));

    return effects;
  }

  /**
   * Dismiss an active effect (deactivates aura or buff).
   * @param {DCCActor} actor
   * @param {string} effectId Item ID or effect identifier
   * @returns {Promise<boolean>}
   */
  async dismissEffect(actor, effectId) {
    if (!actor) return false;
    const item = actor.items?.get ? actor.items.get(effectId) : actor.items?.find?.(i => i.id === effectId || i._id === effectId);
    if (!item) return false;

    if (typeof actor.deactivateAura === 'function') {
      await actor.deactivateAura(item);
    } else {
      await item.update({ 'system.active': false });
    }

    await this.render();
    return true;
  }

  /**
   * Render the effects panel in the DOM.
   * @returns {Promise<DCCEffectsPanel>}
   */
  async render() {
    const doc = globalThis.document;
    if (!doc) return this;

    const { actor, token } = this.getControlledActor();
    const effects = actor ? this.collectEffects(actor, token) : [];

    // Mark expanded flyout state
    for (const eff of effects) {
      eff.expanded = (this.activeFlyoutId === eff.id);
    }

    const context = {
      actor,
      actorName: actor?.name || '',
      hasActor: Boolean(actor),
      effects,
      hasEffects: effects.length > 0
    };

    let existing = doc.getElementById('dcc-effects-panel');
    if (!context.hasEffects) {
      if (existing) existing.remove();
      this.element = null;
      return this;
    }

    const renderTemplateFn = globalThis.foundry?.applications?.handlebars?.renderTemplate
      ?? globalThis.foundry?.utils?.renderTemplate
      ?? globalThis.renderTemplate;

    let htmlString = '';
    if (typeof renderTemplateFn === 'function') {
      try {
        htmlString = await renderTemplateFn(DCCEffectsPanel.defaultOptions.template, context);
      } catch (err) {
        htmlString = this._getFallbackHTML(context);
      }
    } else {
      htmlString = this._getFallbackHTML(context);
    }

    const temp = doc.createElement('div');
    temp.innerHTML = htmlString.trim();
    const newEl = temp.firstElementChild;

    if (existing) {
      existing.replaceWith(newEl);
    } else {
      const parent = doc.getElementById('interface') || doc.getElementById('ui-right') || doc.body;
      parent?.appendChild(newEl);
    }

    this.element = newEl;
    this.updatePosition();
    this.activateListeners(this.element);

    return this;
  }

  /**
   * Dynamic position offset anchored immediately left of Foundry's right sidebar.
   */
  updatePosition() {
    if (!this.element) return;
    const doc = globalThis.document;
    if (!doc) return;

    const sidebar = doc.getElementById('sidebar');
    let rightOffset = 312;

    if (sidebar) {
      const isCollapsed = sidebar.classList.contains('collapsed');
      if (isCollapsed) {
        rightOffset = 48;
      } else if (typeof sidebar.getBoundingClientRect === 'function') {
        const rect = sidebar.getBoundingClientRect();
        rightOffset = Math.round((rect.width || 300) + 12);
      }
    }

    this.element.style.right = `${rightOffset}px`;
  }

  /**
   * Wire DOM interaction listeners.
   * @param {HTMLElement} html
   */
  activateListeners(html) {
    if (!html) return;

    // Click on effect badge to toggle flyout card
    const badges = html.querySelectorAll ? html.querySelectorAll('.dcc-effect-icon-wrap') : [];
    for (const badge of badges) {
      badge.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const parentBadge = badge.closest('.dcc-effect-badge');
        const effectId = parentBadge?.dataset?.effectId;
        this.activeFlyoutId = (this.activeFlyoutId === effectId) ? null : effectId;
        this.render();
      });
    }

    // Dismiss effect button
    const dismissBtns = html.querySelectorAll ? html.querySelectorAll('[data-action="dismiss-effect"]') : [];
    for (const btn of dismissBtns) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const parentBadge = btn.closest('.dcc-effect-badge');
        const itemId = parentBadge?.dataset?.itemId;
        const actorId = parentBadge?.dataset?.actorId;
        const actor = globalThis.game?.actors?.get?.(actorId) || this.getControlledActor().actor;
        if (actor && itemId) {
          await this.dismissEffect(actor, itemId);
        }
      });
    }

    // Click outside closes open flyouts
    globalThis.document?.addEventListener('click', (ev) => {
      if (this.activeFlyoutId && !ev.target.closest?.('#dcc-effects-panel')) {
        this.activeFlyoutId = null;
        this.render();
      }
    }, { once: true });
  }

  /**
   * Fallback HTML string if template renderer is not available.
   */
  _getFallbackHTML(context) {
    const badges = context.effects.map(eff => `
      <div class="dcc-effect-badge ${eff.typeClass} ${eff.expanded ? 'is-expanded' : ''}" data-effect-id="${eff.id}" data-item-id="${eff.itemId || ''}" data-actor-id="${eff.actorId || ''}" title="${eff.name} (${eff.durationLabel})">
        <div class="dcc-effect-icon-wrap" style="position: relative; width: 42px; height: 42px; cursor: pointer; border-radius: 4px; overflow: hidden; border: 2px solid ${eff.isAuraEmitter ? '#f39c12' : eff.isAuraReceiver ? '#3498db' : '#c0392b'};">
          <img class="dcc-effect-icon" src="${eff.img}" alt="${eff.name}" style="width: 100%; height: 100%; object-fit: cover;" />
          <span class="dcc-effect-duration-pill" style="position: absolute; bottom: 1px; right: 1px; background: rgba(0,0,0,0.85); color: #fff; font-size: 10px; font-weight: bold; padding: 1px 3px; border-radius: 2px;">${eff.durationLabel}</span>
        </div>
        ${eff.expanded ? `
          <div class="dcc-effect-flyout" style="position: absolute; right: 50px; top: 0; width: 220px; background: rgba(18,18,24,0.96); border: 1.5px solid #c0392b; border-radius: 4px; padding: 8px; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.7); font-family: 'Oswald', sans-serif;">
            <div style="font-size: 10px; color: #f1c40f;">${eff.typeBadge}</div>
            <h4 style="margin: 2px 0 6px; font-size: 13px;">${eff.name}</h4>
            <div style="font-size: 11px; margin-bottom: 4px;"><strong>Source:</strong> ${eff.sourceName}</div>
            <div style="font-size: 11px; margin-bottom: 4px;"><strong>Duration:</strong> ${eff.fullDurationText}</div>
            <div style="font-size: 11px; margin-bottom: 6px; color: #ddd;">${eff.detailsText}</div>
            ${eff.canDismiss ? `<button type="button" class="dcc-btn-dismiss-effect" data-action="dismiss-effect" style="width: 100%; background: #c0392b; color: #fff; border: none; padding: 4px; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 11px;">Dismiss Aura</button>` : ''}
          </div>
        ` : ''}
      </div>
    `).join('');

    return `
      <div id="dcc-effects-panel" class="dcc-effects-panel" style="position: fixed; top: 110px; right: 312px; z-index: 60; display: flex; flex-direction: column; gap: 6px;">
        ${badges}
      </div>
    `;
  }
}
