/**
 * Tính Khối Lượng Bê Tông — Sàn, Sảnh & Dầm
 * Real-time calculator with unit toggle & formula display
 */
(function () {
  'use strict';
  const DENSITY = 2400;
  const SKEY = 'concrete-calc-v3';

  const $ = (id) => document.getElementById(id);
  const dom = {
    slabL: $('slab-length'), slabW: $('slab-width'), slabT: $('slab-thickness'),
    slabArea: $('slab-area'), slabVol: $('slab-volume'), slabFormula: $('slab-formula'),
    lobbyTb: $('lobby-tbody'), lobbyEmpty: $('lobby-empty'), lobbyTable: $('lobby-table'),
    lobbyStats: $('lobby-stats'), lobbyArea: $('lobby-area'), lobbyVol: $('lobby-volume'),
    lobbyFormulas: $('lobby-formulas'),
    btnAddLobby: $('btn-add-lobby'), btnClrLobby: $('btn-clear-lobbies'),
    beamTb: $('beam-tbody'), beamEmpty: $('beam-empty'), beamTable: $('beam-table'),
    beamFormulas: $('beam-formulas'),
    btnAddBeam: $('btn-add-beam'), btnPreset: $('btn-preset'),
    presetMenu: $('preset-menu'), btnClrBeam: $('btn-clear-all'),
    rSlabV: $('result-slab-vol'), rLobbyV: $('result-lobby-vol'), rBeamV: $('result-beam-vol'),
    rTotalV: $('result-total-vol'), rTotalM: $('result-total-mass'), rTotalT: $('result-total-ton'),
    rTotal: $('result-total'), rOrderV: $('result-order-vol'),
    wastageInput: $('wastage-input'),
    barS: $('bar-slab'), barL: $('bar-lobby'), barB: $('bar-beam'),
    barSP: $('bar-slab-pct'), barLP: $('bar-lobby-pct'), barBP: $('bar-beam-pct'),
    sumA: $('sum-area'), sumLA: $('sum-lobby-area'), sumBC: $('sum-beam-count'),
    sumTV: $('sum-total-vol'), sumTT: $('sum-total-ton'),
    toast: $('toast'), toastTxt: $('toast-text'),
  };

  let beamId = 0, lobbyId = 0;
  let beams = [], lobbies = [];

  // ── Utilities ──
  function fmt(n, d = 3) {
    if (isNaN(n) || !isFinite(n)) return '0';
    return n.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: d });
  }
  function fmtShort(n) {
    if (n === 0) return '0';
    if (Number.isInteger(n)) return String(n);
    return parseFloat(n.toFixed(4)).toString();
  }
  function rawVal(input) { const v = parseFloat(input.value); return isNaN(v) || v < 0 ? 0 : v; }
  function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function toast(t) {
    dom.toastTxt.textContent = t; dom.toast.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => dom.toast.classList.remove('show'), 2500);
  }

  // ── Unit Toggle ──
  // Returns value in METERS from an input, considering its sibling unit-toggle
  function getMeters(input) {
    const v = rawVal(input);
    const btn = input.parentElement.querySelector('.unit-toggle, .unit-toggle--inline');
    if (!btn) return v;
    return btn.dataset.unit === 'cm' ? v / 100 : v;
  }
  function toggleUnit(btn, input) {
    const oldUnit = btn.dataset.unit;
    const val = parseFloat(input.value);
    if (oldUnit === 'm') {
      btn.dataset.unit = 'cm'; btn.textContent = 'cm';
      if (!isNaN(val) && val !== 0) input.value = parseFloat((val * 100).toFixed(4));
      input.step = '1';
    } else {
      btn.dataset.unit = 'm'; btn.textContent = 'm';
      if (!isNaN(val) && val !== 0) input.value = parseFloat((val / 100).toFixed(4));
      input.step = '0.01';
    }
  }

  // Global click handler for all unit toggles
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.unit-toggle, .unit-toggle--inline');
    if (!btn) return;
    const wrapper = btn.closest('.form-input-wrapper, .input-with-unit');
    if (!wrapper) return;
    const input = wrapper.querySelector('input[type="number"]');
    if (!input) return;
    toggleUnit(btn, input);
    updateResults();
  });

  // ── Slab ──
  function getSlabData() {
    const l = getMeters(dom.slabL), w = getMeters(dom.slabW), t = getMeters(dom.slabT);
    return { l, w, t, area: l * w, vol: l * w * t };
  }

  // ── Lobby Calc ──
  function lobbyVol(lb) {
    const l = lobbyMeters(lb, 'length');
    const w = lobbyMeters(lb, 'width');
    const t = lobbyMeters(lb, 'thickness');
    return l * w * t * (lb.twoLayer ? 2 : 1);
  }
  function lobbyMeters(lb, field) {
    const v = lb[field] || 0;
    const u = lb[field + 'Unit'] || 'm';
    return u === 'cm' ? v / 100 : v;
  }
  function lobbyTotals() {
    let a = 0, v = 0;
    lobbies.forEach(lb => {
      const l = lobbyMeters(lb, 'length'), w = lobbyMeters(lb, 'width');
      a += l * w; v += lobbyVol(lb);
    });
    return { area: a, vol: v };
  }

  // ── Beam Calc ──
  function beamMeters(b, field) {
    const v = b[field] || 0;
    const u = b[field + 'Unit'] || 'm';
    return u === 'cm' ? v / 100 : v;
  }
  function beamVol(b, slabT) {
    const l = beamMeters(b, 'length'), w = beamMeters(b, 'width'), h = beamMeters(b, 'height');
    const effH = b.subtractSlab !== false ? Math.max(0, h - slabT) : h;
    return l * w * effH * (b.quantity || 1);
  }
  function beamTotalVol(slabT) { return beams.reduce((s, b) => s + beamVol(b, slabT), 0); }

  // ── Render Lobby Row ──
  function mkLobbyRow(lb) {
    const tr = document.createElement('tr');
    tr.dataset.id = lb.id; tr.classList.add('beam-row-enter');
    const mkCell = (field, val, unit, ph, w) => `<td><div class="input-with-unit">
      <input type="number" class="beam-input" value="${val || ''}" data-field="${field}"
        step="${unit === 'cm' ? 1 : 0.01}" min="0" placeholder="${ph}" ${w ? 'style="width:'+w+'"' : ''}/>
      <button type="button" class="unit-toggle--inline unit-toggle" data-unit="${unit}" data-field="${field}"
        title="Nhấn đổi đơn vị">${unit}</button>
    </div></td>`;
    tr.innerHTML = `<td><input type="text" class="beam-input beam-input--name" value="${escHtml(lb.name)}"
      data-field="name" placeholder="Sảnh 1"/></td>
      ${mkCell('length', lb.length, lb.lengthUnit || 'm', '0.00')}
      ${mkCell('width', lb.width, lb.widthUnit || 'm', '0.00')}
      ${mkCell('thickness', lb.thickness, lb.thicknessUnit || 'cm', '10', '65px')}
      <td>
        <label class="beam-checkbox-wrapper" title="Đổ 2 lớp bê tông (× 2 chiều dày)">
          <input type="checkbox" class="beam-checkbox" data-field="twoLayer" ${lb.twoLayer ? 'checked' : ''} />
          <span class="beam-checkbox-custom"></span>
        </label>
      </td>
      <td><span class="lobby-volume-cell">${fmt(lobbyVol(lb))}</span></td>
      <td><button class="btn btn--danger btn--icon" data-action="del-lobby" type="button">✕</button></td>`;
    return tr;
  }

  function renderLobbies() {
    dom.lobbyTb.innerHTML = '';
    lobbies.forEach(lb => dom.lobbyTb.appendChild(mkLobbyRow(lb)));
    togLobbyEmpty();
  }
  function togLobbyEmpty() {
    const empty = lobbies.length === 0;
    dom.lobbyEmpty.style.display = empty ? 'block' : 'none';
    dom.lobbyTable.style.display = empty ? 'none' : 'table';
    dom.lobbyStats.style.display = empty ? 'none' : 'grid';
  }

  // ── Render Beam Row ──
  function mkBeamRow(b) {
    const slab = getSlabData();
    const tr = document.createElement('tr');
    tr.dataset.id = b.id; tr.classList.add('beam-row-enter');
    const mkCell = (field, val, unit, ph, w) => `<td><div class="input-with-unit">
      <input type="number" class="beam-input" value="${val || ''}" data-field="${field}"
        step="${unit === 'cm' ? 1 : 0.01}" min="0" placeholder="${ph}" ${w ? 'style="width:'+w+'"' : ''}/>
      <button type="button" class="unit-toggle--inline unit-toggle" data-unit="${unit}" data-field="${field}"
        title="Nhấn đổi đơn vị">${unit}</button>
    </div></td>`;
    tr.innerHTML = `<td><input type="text" class="beam-input beam-input--name" value="${escHtml(b.name)}"
      data-field="name" placeholder="D1"/></td>
      <td><select class="beam-input beam-input--select" data-field="type">
        <option value="Chính" ${b.type==='Chính'?'selected':''}>Chính</option>
        <option value="Phụ" ${b.type==='Phụ'?'selected':''}>Phụ</option>
        <option value="Bo" ${b.type==='Bo'?'selected':''}>Bo</option></select></td>
      ${mkCell('length', b.length, b.lengthUnit || 'm', '0.00')}
      ${mkCell('width', b.width, b.widthUnit || 'm', '0.00')}
      ${mkCell('height', b.height, b.heightUnit || 'm', '0.00')}
      <td><input type="number" class="beam-input" value="${b.quantity}" data-field="quantity"
        step="1" min="1" placeholder="1" style="width:50px;"/></td>
      <td>
        <label class="beam-checkbox-wrapper" title="Trừ chiều dày sàn khỏi chiều cao dầm">
          <input type="checkbox" class="beam-checkbox" data-field="subtractSlab" ${b.subtractSlab !== false ? 'checked' : ''} />
          <span class="beam-checkbox-custom"></span>
        </label>
      </td>
      <td><span class="beam-volume">${fmt(beamVol(b, slab.t))}</span></td>
      <td><button class="btn btn--danger btn--icon" data-action="del-beam" type="button">✕</button></td>`;
    return tr;
  }
  function renderBeams() {
    dom.beamTb.innerHTML = '';
    beams.forEach(b => dom.beamTb.appendChild(mkBeamRow(b)));
    togBeamEmpty();
  }
  function togBeamEmpty() {
    const empty = beams.length === 0;
    dom.beamEmpty.style.display = empty ? 'block' : 'none';
    dom.beamTable.style.display = empty ? 'none' : 'table';
  }

  // ── Formulas ──
  function updateSlabFormula(slab) {
    const lv = rawVal(dom.slabL), wv = rawVal(dom.slabW), tv = rawVal(dom.slabT);
    const lu = dom.slabL.parentElement.querySelector('.unit-toggle')?.dataset.unit || 'm';
    const wu = dom.slabW.parentElement.querySelector('.unit-toggle')?.dataset.unit || 'm';
    const tu = dom.slabT.parentElement.querySelector('.unit-toggle')?.dataset.unit || 'cm';
    if (slab.vol === 0) {
      dom.slabFormula.innerHTML = 'V = Dài × Rộng × Dày';
      return;
    }
    dom.slabFormula.innerHTML =
      `V = ${fmtShort(lv)}${lu} × ${fmtShort(wv)}${wu} × ${fmtShort(tv)}${tu} = <strong>${fmt(slab.vol)} m³</strong>`;
  }

  function updateLobbyFormulas() {
    if (lobbies.length === 0) { dom.lobbyFormulas.innerHTML = ''; return; }
    dom.lobbyFormulas.innerHTML = lobbies.map(lb => {
      const v = lobbyVol(lb);
      const l = lb.length || 0, w = lb.width || 0, t = lb.thickness || 0;
      const lu = lb.lengthUnit || 'm', wu = lb.widthUnit || 'm', tu = lb.thicknessUnit || 'cm';
      const tStr = lb.twoLayer
        ? `${fmtShort(t)}${tu} × 2`
        : `${fmtShort(t)}${tu}`;
      return `<div class="formula-item"><strong>${escHtml(lb.name)}:</strong> V = ${fmtShort(l)}${lu} × ${fmtShort(w)}${wu} × ${tStr} = <strong>${fmt(v)} m³</strong></div>`;
    }).join('');
  }

  function updateBeamFormulas(slabT) {
    if (beams.length === 0) { dom.beamFormulas.innerHTML = ''; return; }
    dom.beamFormulas.innerHTML = beams.map(b => {
      const v = beamVol(b, slabT);
      const l = b.length || 0, w = b.width || 0, h = b.height || 0, q = b.quantity || 1;
      const lu = b.lengthUnit || 'm', wu = b.widthUnit || 'm', hu = b.heightUnit || 'm';

      const doSub = b.subtractSlab !== false;
      // Convert slabT (meters) to same unit as beam height for consistent display
      const slabTDisplay = hu === 'cm' ? slabT * 100 : slabT;
      const hStr = doSub ? `(${fmtShort(h)}${hu} − ${fmtShort(slabTDisplay)}${hu})` : `${fmtShort(h)}${hu}`;

      return `<div class="formula-item formula-item--beam"><strong>${escHtml(b.name)}:</strong> V = ${fmtShort(l)}${lu} × ${fmtShort(w)}${wu} × ${hStr} × ${q} = <strong>${fmt(v)} m³</strong></div>`;
    }).join('');
  }

  // ── Update Results ──
  function updateResults() {
    const slab = getSlabData();
    const lt = lobbyTotals();
    const bv = beamTotalVol(slab.t);
    const tv = slab.vol + lt.vol + bv;
    const tm = tv * DENSITY, tt = tm / 1000;
    
    const wastage = parseFloat(dom.wastageInput.value) || 0;
    const recommendedVol = tv * (1 + wastage / 100);

    dom.slabArea.textContent = fmt(slab.area) + ' m²';
    dom.slabVol.textContent = fmt(slab.vol) + ' m³';
    dom.lobbyArea.textContent = fmt(lt.area) + ' m²';
    dom.lobbyVol.textContent = fmt(lt.vol) + ' m³';

    // Update table volumes
    lobbies.forEach(lb => {
      const r = dom.lobbyTb.querySelector(`tr[data-id="${lb.id}"] .lobby-volume-cell`);
      if (r) r.textContent = fmt(lobbyVol(lb));
    });
    beams.forEach(b => {
      const r = dom.beamTb.querySelector(`tr[data-id="${b.id}"] .beam-volume`);
      if (r) r.textContent = fmt(beamVol(b, slab.t));
    });

    dom.rSlabV.textContent = fmt(slab.vol) + ' m³';
    dom.rLobbyV.textContent = fmt(lt.vol) + ' m³';
    dom.rBeamV.textContent = fmt(bv) + ' m³';
    dom.rTotalV.innerHTML = fmt(tv) + ' <span class="result-total__unit">m³</span>';
    
    // Đề xuất đặt hàng
    dom.rOrderV.innerHTML = fmt(recommendedVol, 1) + ' <span class="result-total__unit" style="color: rgba(251, 191, 36, 0.8);">m³</span>';

    dom.rTotalM.textContent = fmt(tm, 0);
    dom.rTotalT.textContent = fmt(tt, 2);

    const sp = tv > 0 ? (slab.vol/tv)*100 : 34;
    const lp = tv > 0 ? (lt.vol/tv)*100 : 33;
    const bp = tv > 0 ? (bv/tv)*100 : 33;
    dom.barS.style.width = sp+'%'; dom.barL.style.width = lp+'%'; dom.barB.style.width = bp+'%';
    dom.barSP.textContent = tv > 0 ? Math.round(sp)+'%' : '—';
    dom.barLP.textContent = tv > 0 ? Math.round(lp)+'%' : '—';
    dom.barBP.textContent = tv > 0 ? Math.round(bp)+'%' : '—';

    dom.sumA.textContent = fmt(slab.area);
    dom.sumLA.textContent = fmt(lt.area);
    dom.sumBC.textContent = beams.reduce((s,b) => s + (b.quantity||0), 0);
    dom.sumTV.textContent = fmt(tv);
    dom.sumTT.textContent = fmt(tt, 2);

    // Formulas
    updateSlabFormula(slab);
    updateLobbyFormulas();
    updateBeamFormulas(slab.t);

    dom.rTotal.classList.remove('pulse');
    void dom.rTotal.offsetWidth;
    dom.rTotal.classList.add('pulse');
    saveData();
  }

  // ── CRUD ──
  function addLobby(o = {}) {
    const lb = { id: ++lobbyId, name: o.name || `Sảnh ${lobbyId}`,
      length: o.length || 0, lengthUnit: o.lengthUnit || 'm',
      width: o.width || 0, widthUnit: o.widthUnit || 'm',
      thickness: o.thickness || 10, thicknessUnit: o.thicknessUnit || 'cm',
      twoLayer: o.twoLayer || false };
    lobbies.push(lb);
    dom.lobbyTb.appendChild(mkLobbyRow(lb));
    togLobbyEmpty(); updateResults();
    const inp = dom.lobbyTb.lastElementChild?.querySelector('[data-field="length"]');
    if (inp) setTimeout(() => inp.focus(), 100);
    return lb;
  }
  function delLobby(id) {
    lobbies = lobbies.filter(l => l.id !== id);
    togLobbyEmpty(); updateResults();
    const row = dom.lobbyTb.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;
    row.classList.add('beam-row-exit');
    const remove = () => row.remove();
    row.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 350);
  }
  function addBeam(o = {}) {
    const b = { id: ++beamId, name: o.name || `D${beamId}`, type: o.type || 'Chính',
      length: o.length || 0, lengthUnit: o.lengthUnit || 'm',
      width: o.width || 0, widthUnit: o.widthUnit || 'm',
      height: o.height || 0, heightUnit: o.heightUnit || 'm',
      quantity: o.quantity || 1, subtractSlab: o.subtractSlab !== false };
    beams.push(b);
    dom.beamTb.appendChild(mkBeamRow(b));
    togBeamEmpty(); updateResults();
    const inp = dom.beamTb.lastElementChild?.querySelector('[data-field="length"]');
    if (inp) setTimeout(() => inp.focus(), 100);
    return b;
  }
  function delBeam(id) {
    beams = beams.filter(b => b.id !== id);
    togBeamEmpty(); updateResults();
    const row = dom.beamTb.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;
    row.classList.add('beam-row-exit');
    const remove = () => row.remove();
    row.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 350);
  }

  // ── Persistence ──
  function saveData() {
    // Read current unit states from DOM for slab
    const slabUnits = {};
    ['slabL','slabW','slabT'].forEach(k => {
      const btn = dom[k].parentElement.querySelector('.unit-toggle');
      slabUnits[k] = btn ? btn.dataset.unit : 'm';
    });
    try {
      localStorage.setItem(SKEY, JSON.stringify({
        slab: { l: rawVal(dom.slabL), w: rawVal(dom.slabW), t: rawVal(dom.slabT), units: slabUnits },
        lobbies, lobbyId, beams, beamId,
        wastage: parseFloat(dom.wastageInput.value) || 0
      }));
    } catch(e) {}
  }
  function loadData() {
    try {
      const d = JSON.parse(localStorage.getItem(SKEY));
      if (!d) return false;
      if (d.slab) {
        dom.slabL.value = d.slab.l || '';
        dom.slabW.value = d.slab.w || '';
        dom.slabT.value = d.slab.t || 10;
        if (d.slab.units) {
          const setU = (inp, u) => {
            const btn = inp.parentElement.querySelector('.unit-toggle');
            if (btn && u) { btn.dataset.unit = u; btn.textContent = u; inp.step = u === 'cm' ? '1' : '0.01'; }
          };
          setU(dom.slabL, d.slab.units.slabL);
          setU(dom.slabW, d.slab.units.slabW);
          setU(dom.slabT, d.slab.units.slabT);
        }
      }
      if (Array.isArray(d.lobbies) && d.lobbies.length > 0) {
        lobbyId = d.lobbyId || 0; lobbies = d.lobbies; renderLobbies();
      }
      if (Array.isArray(d.beams) && d.beams.length > 0) {
        beamId = d.beamId || 0; beams = d.beams; renderBeams();
      }
      if (d.wastage !== undefined) {
        dom.wastageInput.value = d.wastage;
      }
      updateResults(); return true;
    } catch(e) { return false; }
  }

  // ── Events ──
  [dom.slabL, dom.slabW, dom.slabT, dom.wastageInput].forEach(i => i.addEventListener('input', updateResults));

  dom.btnAddLobby.addEventListener('click', () => { addLobby(); toast('✅ Đã thêm sảnh mới'); });
  dom.btnClrLobby.addEventListener('click', () => {
    if (lobbies.length === 0) return;
    lobbies = []; renderLobbies(); updateResults(); toast('🗑️ Đã xóa tất cả sảnh');
  });

  // Lobby table events (delegated)
  dom.lobbyTb.addEventListener('input', (e) => {
    const inp = e.target, row = inp.closest('tr');
    if (!row) return;
    const lb = lobbies.find(l => l.id === parseInt(row.dataset.id));
    if (!lb) return;
    const f = inp.dataset.field;
    if (f === 'name') lb[f] = inp.value;
    else if (f) lb[f] = parseFloat(inp.value) || 0;
    updateResults();
  });
  dom.lobbyTb.addEventListener('change', (e) => {
    const inp = e.target, row = inp.closest('tr');
    if (!row) return;
    const lb = lobbies.find(l => l.id === parseInt(row.dataset.id));
    if (!lb || inp.dataset.field !== 'twoLayer') return;
    lb.twoLayer = inp.checked;
    const newRow = mkLobbyRow(lb);
    newRow.classList.remove('beam-row-enter');
    row.replaceWith(newRow);
    updateResults();
  });
  dom.lobbyTb.addEventListener('click', (e) => {
    // Handle unit toggle for lobby — update state AFTER global handler toggles
    const unitBtn = e.target.closest('.unit-toggle--inline');
    if (unitBtn) {
      const row = unitBtn.closest('tr');
      const lb = lobbies.find(l => l.id === parseInt(row?.dataset.id));
      if (lb) {
        const field = unitBtn.dataset.field;
        // Global handler toggles unit + converts input.value; sync both to data model
        setTimeout(() => {
          const inp = unitBtn.closest('.input-with-unit')?.querySelector('input[type="number"]');
          if (inp) lb[field] = parseFloat(inp.value) || 0;
          lb[field + 'Unit'] = unitBtn.dataset.unit;
          updateResults();
        }, 0);
      }
      return;
    }
    const del = e.target.closest('[data-action="del-lobby"]');
    if (del) { delLobby(parseInt(del.closest('tr').dataset.id)); toast('🗑️ Đã xóa sảnh'); }
  });

  dom.btnAddBeam.addEventListener('click', () => { addBeam(); toast('✅ Đã thêm dầm mới'); });
  dom.btnPreset.addEventListener('click', (e) => { e.stopPropagation(); dom.presetMenu.classList.toggle('active'); });
  document.addEventListener('click', (e) => {
    if (!dom.presetMenu.contains(e.target) && e.target !== dom.btnPreset) dom.presetMenu.classList.remove('active');
  });
  dom.presetMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.preset-item');
    if (!item) return;
    addBeam({ type: item.dataset.type, width: parseFloat(item.dataset.w), height: parseFloat(item.dataset.h),
      name: `D${beamId + 1}` });
    dom.presetMenu.classList.remove('active');
    toast(`⚡ Đã thêm dầm ${item.dataset.type.toLowerCase()}`);
  });
  dom.btnClrBeam.addEventListener('click', () => {
    if (beams.length === 0) return;
    beams = []; renderBeams(); updateResults(); toast('🗑️ Đã xóa tất cả dầm');
  });

  dom.beamTb.addEventListener('input', (e) => {
    const inp = e.target, row = inp.closest('tr');
    if (!row) return;
    const b = beams.find(x => x.id === parseInt(row.dataset.id));
    if (!b) return;
    const f = inp.dataset.field;
    if (f === 'name' || f === 'type') b[f] = inp.value;
    else if (f) b[f] = parseFloat(inp.value) || 0;
    updateResults();
  });
  dom.beamTb.addEventListener('change', (e) => {
    const inp = e.target, row = inp.closest('tr');
    if (!row) return;
    const b = beams.find(x => x.id === parseInt(row.dataset.id));
    if (b && inp.dataset.field === 'type') { b.type = inp.value; updateResults(); }
    if (b && inp.dataset.field === 'subtractSlab') { b.subtractSlab = inp.checked; updateResults(); }
  });
  dom.beamTb.addEventListener('click', (e) => {
    const unitBtn = e.target.closest('.unit-toggle--inline');
    if (unitBtn) {
      const row = unitBtn.closest('tr');
      const b = beams.find(x => x.id === parseInt(row?.dataset.id));
      if (b) {
        const f = unitBtn.dataset.field;
        setTimeout(() => {
          const inp = unitBtn.closest('.input-with-unit')?.querySelector('input[type="number"]');
          if (inp) b[f] = parseFloat(inp.value) || 0;
          b[f + 'Unit'] = unitBtn.dataset.unit;
          updateResults();
        }, 0);
      }
      return;
    }
    const del = e.target.closest('[data-action="del-beam"]');
    if (del) { delBeam(parseInt(del.closest('tr').dataset.id)); toast('🗑️ Đã xóa dầm'); }
  });

  // ── Export Report ──
  function exportReport() {
    const slab = getSlabData();
    const lt = lobbyTotals();
    const bv = beamTotalVol(slab.t);
    const tv = slab.vol + lt.vol + bv;
    const wastage = parseFloat(dom.wastageInput.value) || 0;
    const orderVol = tv * (1 + wastage / 100);
    const mass = tv * DENSITY;
    const ton = mass / 1000;

    // Read slab display inputs
    const slLv = rawVal(dom.slabL), slWv = rawVal(dom.slabW), slTv = rawVal(dom.slabT);
    const slLu = dom.slabL.parentElement.querySelector('.unit-toggle')?.dataset.unit || 'm';
    const slWu = dom.slabW.parentElement.querySelector('.unit-toggle')?.dataset.unit || 'm';
    const slTu = dom.slabT.parentElement.querySelector('.unit-toggle')?.dataset.unit || 'cm';

    // ── Section helpers ──
    function tag(text, cls) { return `<span class="tag${cls ? ' tag--'+cls : ''}">${escHtml(text)}</span>`; }
    function fmtV(v) { return fmt(v, 3) + ' m³'; }

    // ── Slab ──
    const needConvS = slLu !== 'm' || slWu !== 'm' || slTu !== 'm';
    const slabSection = `
<section>
  <h2>I. SÀN</h2>
  <div class="cline"><span class="lbl">Công thức:</span><span class="eq">V<sub>sàn</sub> = Dài × Rộng × Dày</span></div>
  <div class="cline"><span class="lbl">Thay số:</span><span class="eq">V<sub>sàn</sub> = ${fmtShort(slLv)}${slLu} × ${fmtShort(slWv)}${slWu} × ${fmtShort(slTv)}${slTu}</span></div>
  ${needConvS ? `<div class="cline muted"><span class="lbl">→ m:</span><span class="eq">${fmtShort(slab.l)}m × ${fmtShort(slab.w)}m × ${fmtShort(slab.t)}m</span></div>` : ''}
  <div class="cline result"><span class="lbl">Kết quả:</span><span class="eq"><b>V<sub>sàn</sub> = ${fmtV(slab.vol)}</b></span></div>
</section>`;

    // ── Lobbies ──
    let secN = 2, lobbySection = '';
    if (lobbies.length > 0) {
      const roman = ['I','II','III','IV','V'][secN - 1];
      const rows = lobbies.map(lb => {
        const lu = lb.lengthUnit||'m', wu = lb.widthUnit||'m', tu = lb.thicknessUnit||'cm';
        const tStr = lb.twoLayer
          ? `${fmtShort(lb.thickness||0)}${tu} × 2`
          : `${fmtShort(lb.thickness||0)}${tu}`;
        const hasConv = lu==='cm'||wu==='cm'||tu==='cm';
        const lm = lobbyMeters(lb,'length'), wm = lobbyMeters(lb,'width');
        const tm = lobbyMeters(lb,'thickness') * (lb.twoLayer ? 2 : 1);
        const conv = hasConv ? `<br><span class="muted">→ ${fmtShort(lm)}m × ${fmtShort(wm)}m × ${fmtShort(tm)}m</span>` : '';
        return `<tr>
          <td>${escHtml(lb.name)}${lb.twoLayer ? '<br>'+tag('2 lớp') : ''}</td>
          <td class="code">${fmtShort(lb.length||0)}${lu} × ${fmtShort(lb.width||0)}${wu} × ${tStr}${conv}</td>
          <td class="r">${fmtV(lobbyVol(lb))}</td></tr>`;
      }).join('');
      lobbySection = `
<section>
  <h2>${roman}. SẢNH</h2>
  <table>
    <thead><tr><th>Tên sảnh</th><th>Công thức: V = Dài × Rộng × Dày</th><th>Thể tích</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="2">Tổng thể tích sảnh</td><td class="r"><b>${fmtV(lt.vol)}</b></td></tr></tfoot>
  </table>
</section>`;
      secN++;
    }

    // ── Beams ──
    let beamSection = '';
    if (beams.length > 0) {
      const roman = ['I','II','III','IV','V'][secN - 1];
      const slabNote = slTu !== 'm'
        ? `${fmtShort(slTv)}${slTu} = ${fmtShort(slab.t)}m`
        : `${fmtShort(slab.t)}m`;
      const rows = beams.map(b => {
        const lu = b.lengthUnit||'m', wu = b.widthUnit||'m', hu = b.heightUnit||'m';
        const doSub = b.subtractSlab !== false;
        const slabTInHU = hu === 'cm' ? slab.t * 100 : slab.t;
        const hStr = doSub
          ? `(${fmtShort(b.height||0)}${hu} − ${fmtShort(slabTInHU)}${hu})`
          : `${fmtShort(b.height||0)}${hu}`;
        const q = b.quantity || 1;
        const hasConv = lu==='cm'||wu==='cm'||hu==='cm';
        const lm = beamMeters(b,'length'), wm = beamMeters(b,'width'), hm = beamMeters(b,'height');
        const effH = doSub ? Math.max(0, hm - slab.t) : hm;
        const conv = hasConv ? `<br><span class="muted">→ ${fmtShort(lm)}m × ${fmtShort(wm)}m × ${fmtShort(effH)}m × ${q}</span>` : '';
        const tags = [tag(b.type), doSub ? tag('Trừ sàn','info') : ''].filter(Boolean).join(' ');
        return `<tr>
          <td>${escHtml(b.name)}<br>${tags}</td>
          <td class="code">${fmtShort(b.length||0)}${lu} × ${fmtShort(b.width||0)}${wu} × ${hStr} × ${q}${conv}</td>
          <td class="r">${fmtV(beamVol(b, slab.t))}</td></tr>`;
      }).join('');
      const totalQ = beams.reduce((s, b) => s + (b.quantity || 1), 0);
      beamSection = `
<section>
  <h2>${roman}. DẦM</h2>
  <p class="note">* "Trừ sàn": trừ chiều dày sàn (${slabNote}) khỏi chiều cao dầm để tránh tính trùng phần giao với sàn.</p>
  <table>
    <thead><tr><th>Tên dầm</th><th>Công thức: V = Dài × Rộng × Cao × SL</th><th>Thể tích</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="2">Tổng thể tích dầm (${totalQ} dầm)</td><td class="r"><b>${fmtV(bv)}</b></td></tr></tfoot>
  </table>
</section>`;
      secN++;
    }

    // ── Summary ──
    const roman = ['I','II','III','IV','V'][secN - 1];
    const totalQ = beams.reduce((s, b) => s + (b.quantity || 1), 0);
    const summarySection = `
<section class="summary">
  <h2>${roman}. KẾT QUẢ TỔNG HỢP</h2>
  <table>
    <tbody>
      <tr><td>Thể tích sàn</td><td class="r">${fmtV(slab.vol)}</td></tr>
      ${lobbies.length > 0 ? `<tr><td>Thể tích sảnh (${lobbies.length} sảnh)</td><td class="r">${fmtV(lt.vol)}</td></tr>` : ''}
      ${beams.length > 0 ? `<tr><td>Thể tích dầm (${totalQ} dầm)</td><td class="r">${fmtV(bv)}</td></tr>` : ''}
      <tr class="tr-sub"><td colspan="2"><i>Ghi chú: Thể tích lý thuyết, chưa trừ thể tích cốt thép.</i></td></tr>
      <tr class="tr-total"><td><b>Tổng thể tích lý thuyết</b></td><td class="r"><b>${fmtV(tv)}</b></td></tr>
      <tr class="tr-gap"><td colspan="2"></td></tr>
      <tr><td>Khối lượng riêng bê tông</td><td class="r">2.400 kg/m³</td></tr>
      <tr><td>${fmt(tv, 3)} m³ × 2.400 kg/m³</td><td class="r">${fmt(mass, 0)} kg = ${fmt(ton, 2)} tấn</td></tr>
      <tr class="tr-gap"><td colspan="2"></td></tr>
      <tr><td>Hao hụt dự kiến (cốp pha, bơm bê tông, v.v.)</td><td class="r">${wastage}%</td></tr>
      <tr><td>${fmt(tv, 3)} m³ × (1 + ${wastage}/100)</td><td class="r">${fmt(orderVol, 3)} m³</td></tr>
      <tr class="tr-order"><td><b>ĐỀ XUẤT ĐẶT BÊ TÔNG</b></td><td class="r"><b>${fmt(orderVol, 1)} m³</b></td></tr>
    </tbody>
  </table>
</section>`;

    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Bảng Tính Khối Lượng Bê Tông</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Times New Roman',Times,serif;font-size:12pt;color:#111;padding:18mm 18mm 15mm 25mm;line-height:1.55}
h1{text-align:center;font-size:16pt;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
.meta{text-align:center;font-size:10pt;color:#555;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #111}
section{margin-bottom:20px}
h2{font-size:13pt;border-bottom:1px solid #666;padding-bottom:3px;margin-bottom:10px}
.cline{display:flex;gap:12px;margin:3px 0;align-items:baseline}
.lbl{min-width:88px;color:#555;font-size:10.5pt;flex-shrink:0}
.eq{font-family:'Courier New',monospace;font-size:11pt}
.cline.muted .lbl,.cline.muted .eq{color:#888}
.cline.result .eq{font-size:12pt}
.muted{color:#888;font-size:9.5pt}
.note{font-size:10pt;color:#555;font-style:italic;margin-bottom:8px}
table{width:100%;border-collapse:collapse;font-size:11pt;margin-top:4px}
th{background:#e0e0e0;font-weight:bold;padding:5px 8px;border:1px solid #888;text-align:left}
td{padding:5px 8px;border:1px solid #ccc;vertical-align:middle}
tfoot td{background:#efefef;font-weight:bold;border:1px solid #888}
.code{font-family:'Courier New',monospace;font-size:9.5pt;line-height:1.6}
.r{text-align:right;white-space:nowrap}
.tag{display:inline-block;font-size:8.5pt;background:#e8e8e8;border:1px solid #ccc;padding:0 4px;border-radius:2px;font-family:sans-serif}
.tag--info{background:#dbeafe;border-color:#93c5fd}
.summary table{font-size:12pt}
.tr-total td{background:#f0f0f0;font-size:13pt;border-top:2px solid #888;border-bottom:2px solid #888}
.tr-order td{background:#e8f5e9;font-size:14pt;color:#1b5e20;border:2px solid #4caf50;font-weight:bold}
.tr-gap td{padding:4px;border:none;background:transparent}
.tr-sub td{font-size:9.5pt;color:#666;border:none;padding:2px 8px}
.signature{margin-top:36px;display:flex;justify-content:space-around}
.sign-block{text-align:center;width:42%}
.sign-block .title{font-weight:bold;margin-bottom:4px}
.sign-block .hint{font-size:10pt;color:#555;font-style:italic;margin-bottom:52px}
.sign-block .line{border-top:1px solid #333;padding-top:4px;font-size:10pt;color:#555}
.btn-print{display:block;margin:24px auto 0;padding:10px 32px;background:#1565c0;color:#fff;border:none;border-radius:6px;font-size:13pt;cursor:pointer;font-family:sans-serif}
@media print{.btn-print{display:none!important}body{padding:10mm 15mm 10mm 20mm}section{page-break-inside:avoid}}
</style>
</head>
<body>
<h1>Bảng Tính Khối Lượng Bê Tông</h1>
<p class="meta">Ngày lập: ${dateStr} &nbsp;|&nbsp; Công cụ: Tính Khối Lượng Bê Tông Online</p>
${slabSection}
${lobbySection}
${beamSection}
${summarySection}
<div class="signature">
  <div class="sign-block">
    <div class="title">Người lập bảng tính</div>
    <div class="hint">(Ký và ghi rõ họ tên)</div>
    <div class="line">&nbsp;</div>
  </div>
  <div class="sign-block">
    <div class="title">Nhà thầu xác nhận</div>
    <div class="hint">(Ký và ghi rõ họ tên)</div>
    <div class="line">&nbsp;</div>
  </div>
</div>
<button class="btn-print" onclick="window.print()">🖨️ In / Lưu PDF</button>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'width=900,height=750');
    if (!win) { URL.revokeObjectURL(url); toast('❌ Trình duyệt chặn popup. Hãy cho phép popup rồi thử lại.'); return; }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  const btnPrint = $('btn-print');
  if (btnPrint) btnPrint.addEventListener('click', exportReport);

  // ── Init ──
  if (!loadData()) updateResults();
  togLobbyEmpty(); togBeamEmpty();
})();
