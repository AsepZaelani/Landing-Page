const io = new IntersectionObserver(e => e.forEach(x => x.isIntersecting && x.target.classList.add('in')), { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.card').forEach(c => { c.classList.toggle('hide', b.dataset.f !== 'all' && c.dataset.cat !== b.dataset.f); c.classList.add('in') })
});
const ul = document.querySelector('nav ul'); document.getElementById('bg').onclick = () => ul.classList.toggle('open');
ul.querySelectorAll('a').forEach(a => a.onclick = () => ul.classList.remove('open'));
const secs = ['beranda', 'menu', 'ulasan', 'tentang'].map(i => document.getElementById(i));
addEventListener('scroll', () => {
    let cur = 'beranda'; secs.forEach(x => { if (x.getBoundingClientRect().top < 200) cur = x.id });
    ul.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + cur))
});

/* ===== Percantik tampilan (bilah progres, header, jumlah di tab, umpan balik tombol) ===== */
(() => {
    const prog = document.createElement("div"); prog.className = "prog"; prog.setAttribute("aria-hidden", "true"); document.body.prepend(prog);
    const hd = document.querySelector("header");
    const onScroll = () => {
        const h = document.documentElement, max = h.scrollHeight - h.clientHeight;
        prog.style.width = (max > 0 ? h.scrollTop / max * 100 : 0) + "%";
        hd.classList.toggle("scrolled", h.scrollTop > 30);
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    const cards = [...document.querySelectorAll(".card[data-cat]")];
    document.querySelectorAll(".tabs button").forEach(b => {
        const f = b.dataset.f, n = f === "all" ? cards.length : cards.filter(c => c.dataset.cat === f).length;
        b.insertAdjacentHTML("beforeend", `<span class="n">${n}</span>`);
    });
    document.addEventListener("click", e => {
        const a = e.target.closest(".add"); if (!a) return;
        const t = a.textContent; a.classList.add("ok"); a.textContent = "✓ Ditambah";
        clearTimeout(a._t); a._t = setTimeout(() => { a.classList.remove("ok"); a.textContent = t.replace("✓ Ditambah", "+ Keranjang") }, 900);
    });
    const cn = document.getElementById("cn"), wa = document.querySelector(".wa");
    if (cn && wa) { const upd = () => wa.classList.toggle("has", cn.textContent.trim() !== "0"); new MutationObserver(upd).observe(cn, { childList: true, characterData: true, subtree: true }); upd() }
})();

/* ===== Elemen interaktif: status buka, cari & urutkan, favorit, detail menu, FAQ, bagikan ===== */
(() => {
    const $q = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
    const cards = $$(".card[data-n]");
    const rupiah = v => "Rp" + v.toLocaleString("id-ID");
    const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cat = { bakso: "🥩 Bakso", mie: "🍜 Mie", minuman: "🥤 Minuman" };
    const note = t => { typeof toast === "function" && toast(t) };

    /* 1. Status buka / tutup (zona waktu WIB, jam 08.00 - 21.00) */
    const st = $q("#st");
    function status() {
        if (!st) return;
        const t = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
        const m = t.getHours() * 60 + t.getMinutes(), buka = 8 * 60, tutup = 21 * 60; let k, x;
        if (m >= buka && m < tutup) { const s = tutup - m; k = s <= 60 ? "warn" : "ok"; x = s <= 60 ? "🟠 Segera tutup · " + s + " menit lagi" : "🟢 Buka sekarang · sampai 21.00" }
        else { k = "off"; x = m < buka ? "🔴 Belum buka · buka pukul 08.00" : "🔴 Sudah tutup · buka lagi pukul 08.00" }
        st.className = "st " + k; st.textContent = x;
    }
    status(); setInterval(status, 60000);

    /* 2. Favorit */
    let favs = new Set(); try { favs = new Set(JSON.parse(localStorage.getItem("bmk_fav") || "[]")) } catch (e) { }
    cards.forEach(c => {
        c.tabIndex = 0;
        const b = document.createElement("button"); b.type = "button"; b.className = "fav"; b.textContent = "♡"; b.setAttribute("aria-label", "Tandai favorit " + c.dataset.n); b.setAttribute("aria-pressed", "false"); c.appendChild(b);
    });
    const tabs = $q(".tabs");
    const favTab = document.createElement("button"); favTab.dataset.f = "fav"; favTab.innerHTML = '❤️ Favorit<span class="n">0</span>'; tabs.appendChild(favTab);
    function paintFav() {
        cards.forEach(c => { const on = favs.has(c.dataset.n), b = c.querySelector(".fav"); b.classList.toggle("on", on); b.textContent = on ? "♥" : "♡"; b.setAttribute("aria-pressed", on) });
        favTab.querySelector(".n").textContent = favs.size;
        const d = $q("#dfav"); if (d && cur) { const on = favs.has(cur.dataset.n); d.classList.toggle("on", on); d.textContent = on ? "♥" : "♡" }
    }
    function toggleFav(c) {
        const n = c.dataset.n; if (favs.has(n)) { favs.delete(n); note("💔 " + n + " dihapus dari favorit") } else { favs.add(n); note("❤️ " + n + " masuk favorit") }
        try { localStorage.setItem("bmk_fav", JSON.stringify([...favs])) } catch (e) { }
        paintFav(); if (tab === "fav") apply();
    }

    /* 3. Filter tab + cari + urutkan */
    let tab = "all", query = "", sort = "", cur = null;
    function apply() {
        let shown = 0;
        cards.forEach(c => {
            const okT = tab === "all" || (tab === "fav" ? favs.has(c.dataset.n) : c.dataset.cat === tab);
            const hay = norm(c.dataset.n + " " + c.querySelector("p").textContent);
            const okQ = !query || query.split(/\s+/).every(w => hay.includes(w));
            const ok = okT && okQ; c.classList.toggle("hide", !ok); c.classList.add("in"); if (ok) shown++;
        });
        const arr = [...cards];
        if (sort === "lo") arr.sort((a, b) => a.dataset.p - b.dataset.p);
        else if (sort === "hi") arr.sort((a, b) => b.dataset.p - a.dataset.p);
        else if (sort === "az") arr.sort((a, b) => a.dataset.n.localeCompare(b.dataset.n, "id"));
        cards.forEach(c => c.style.order = sort ? arr.indexOf(c) : "");
        const nr = $q("#nores"); nr.hidden = shown > 0;
        $q("#nrt").textContent = tab === "fav" && !query ? "💛 Belum ada favorit. Tekan ♡ pada menu yang kamu suka." : "😅 Menu tidak ditemukan.";
    }
    $$(".tabs button").forEach(b => b.onclick = () => { tab = b.dataset.f; $$(".tabs button").forEach(x => x.classList.toggle("on", x === b)); apply() });
    $q("#q").oninput = e => { query = norm(e.target.value.trim()); apply() };
    $q("#srt").onchange = e => { sort = e.target.value; apply() };
    $q("#rst").onclick = () => { tab = "all"; query = ""; sort = ""; $q("#q").value = ""; $q("#srt").value = ""; $$(".tabs button").forEach(x => x.classList.toggle("on", x.dataset.f === "all")); apply() };

    /* 4. Detail menu (klik foto / nama) */
    const dtl = $q("#dtl");
    const list = () => cards.filter(c => !c.classList.contains("hide")).sort((a, b) => (parseInt(a.style.order) || 0) - (parseInt(b.style.order) || 0));
    function show(c) {
        cur = c; const img = c.querySelector("img"), bd = c.querySelector(".badge");
        $q("#dimg").src = img.currentSrc || img.src; $q("#dimg").alt = c.dataset.n;
        $q("#dname").textContent = c.dataset.n; $q("#ddesc").textContent = c.querySelector("p").textContent;
        $q("#dprice").textContent = rupiah(+c.dataset.p); $q("#dcat").textContent = cat[c.dataset.cat] || "";
        $q("#dbadge").textContent = bd ? bd.textContent : ""; $q("#dbadge").hidden = !bd;
        const a = $q("#dadd"); a.classList.remove("ok"); a.textContent = "+ Keranjang";
        paintFav();
    }
    function openD(c) { show(c); dtl.hidden = false; requestAnimationFrame(() => dtl.classList.add("on")); document.body.style.overflow = "hidden"; $q("#dx").focus() }
    function closeD() { if (dtl.hidden) return; dtl.classList.remove("on"); setTimeout(() => { dtl.hidden = true }, 250); document.body.style.overflow = ""; cur = null }
    function step(d) { const l = list(); if (!l.length) return; show(l[(l.indexOf(cur) + d + l.length) % l.length]) }
    $q(".grid").addEventListener("click", e => {
        const c = e.target.closest(".card"); if (!c) return;
        if (e.target.closest(".fav")) { toggleFav(c); return }
        if (e.target.closest(".add")) return;
        openD(c);
    });
    $q(".grid").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) { e.preventDefault(); openD(e.target) } });
    $q("#dx").onclick = closeD;
    dtl.addEventListener("click", e => { if (e.target === dtl) closeD() });
    $q("#dprev").onclick = () => step(-1); $q("#dnext").onclick = () => step(1);
    $q("#dfav").onclick = () => cur && toggleFav(cur);
    $q("#dadd").onclick = () => { if (!cur) return; cur.querySelector(".add").click(); const a = $q("#dadd"); a.classList.add("ok"); a.textContent = "✓ Ditambah"; clearTimeout(a._t); a._t = setTimeout(() => { a.classList.remove("ok"); a.textContent = "+ Keranjang" }, 1000) };
    document.addEventListener("keydown", e => {
        if (dtl.hidden) return;
        if (e.key === "Escape") closeD();
        if (e.key === "ArrowLeft") step(-1);
        if (e.key === "ArrowRight") step(1);
    });
    paintFav(); apply();

    /* 5. FAQ: satu jawaban terbuka pada satu waktu */
    const ds = $$(".faq details");
    ds.forEach(d => d.addEventListener("toggle", () => { if (d.open) ds.forEach(o => { if (o !== d) o.open = false }) }));

    /* 6. Chat WhatsApp & bagikan halaman */
    const wc = $q("#wachat");
    if (wc) wc.onclick = e => {
        e.preventDefault();
        if (typeof WA_NUMBER === "undefined" || !WA_NUMBER) { note("Nomor WhatsApp warung belum diatur"); return }
        window.open("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent("Halo Bakso MAS Kembar, saya mau tanya menu."), "_blank");
    };
    const sh = $q("#shr");
    if (sh) sh.onclick = async () => {
        const d = { title: document.title, text: "Bakso MAS Kembar Pusat - Leuwi Gajah", url: location.href };
        try { if (navigator.share) { await navigator.share(d); return } } catch (e) { if (e && e.name === "AbortError") return }
        try { await navigator.clipboard.writeText(location.href); note("🔗 Link halaman disalin") } catch (e) { prompt("Salin link ini:", location.href) }
    };
})();

// >>> GANTI dengan nomor WhatsApp warung (format 628xxxxxxxxxx, tanpa + atau spasi)
const WA_NUMBER = "";
const rp = v => "Rp" + v.toLocaleString("id-ID");
let cart = {}; try { cart = JSON.parse(localStorage.getItem("bmk") || "{}") } catch (e) { }
const $ = i => document.getElementById(i);
function save() { try { localStorage.setItem("bmk", JSON.stringify(cart)) } catch (e) { } }
function badge() { $("cn").textContent = Object.values(cart).reduce((a, c) => a + c.q, 0) }
function toast(t) { const e = $("ts"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("on"), 1800) }

/* Data menu diambil otomatis dari kartu menu di halaman */
const MENU = [...document.querySelectorAll(".card[data-n]")].map(c => ({ n: c.dataset.n, p: +c.dataset.p, cat: c.dataset.cat || "", img: (c.querySelector("img") || {}).src || "" }));
const P = {}; MENU.forEach(m => P[m.n] = m);
const GRP = { bakso: "🥩 Bakso", mie: "🍜 Mie", minuman: "🥤 Minuman" };

function opts(sel) {
    let h = '<option value="">Pilih menu…</option>';
    for (const k in GRP) { h += `<optgroup label="${GRP[k]}">` + MENU.filter(m => m.cat === k).map(m => `<option value="${m.n}"${m.n === sel ? " selected" : ""}>${m.n} — ${rp(m.p)}</option>`).join("") + "</optgroup>" }
    return h;
}
function paint(r) {
    const n = r.querySelector("select").value, q = Math.max(1, parseInt(r.querySelector("input").value) || 1), th = r.querySelector(".th");
    th.style.backgroundImage = n ? `url("${P[n].img}")` : ""; th.textContent = n ? "" : "🍜";
    r.querySelector(".msub").textContent = n ? rp(P[n].p * q) : "";
}
function addRow(sel, q) {
    const d = document.createElement("div"); d.className = "mrow";
    d.innerHTML = `<div class="mtop"><span class="th"></span><select class="fi" aria-label="Menu">${opts(sel)}</select></div><div class="mbot"><div class="stp"><button type="button" data-s="-" aria-label="Kurangi">−</button><input type="number" min="1" max="99" value="${q || 1}" aria-label="Jumlah"><button type="button" data-s="+" aria-label="Tambah">+</button></div><b class="msub"></b><button type="button" class="rm" aria-label="Hapus menu">✕</button></div>`;
    $("rows").appendChild(d); paint(d);
}
function items() { const o = {}; $("rows").querySelectorAll(".mrow").forEach(r => { const n = r.querySelector("select").value, q = Math.max(1, parseInt(r.querySelector("input").value) || 1); if (n) o[n] = (o[n] || 0) + q }); return o }
/* Hitung total & sinkronkan ke keranjang (badge di tombol hijau ikut berubah) */
function calc() {
    const o = items(); let t = 0, c = 0; cart = {};
    for (const n in o) { t += P[n].p * o[n]; c += o[n]; cart[n] = { p: P[n].p, q: o[n] } }
    $("mtt").textContent = rp(t); $("mcount").textContent = c + " item"; $("e1").hidden = true; save(); badge(); return t;
}
function jenis() { return document.querySelector('input[name=jt]:checked').value }
function tampil() { const t = jenis(); $("mj").hidden = t !== "Dine In"; $("al").hidden = t !== "Delivery"; $("fee").hidden = t !== "Delivery" }
function buka() {
    $("ts").classList.remove("on"); $("rows").innerHTML = ""; const k = Object.keys(cart).filter(n => P[n]);
    (k.length ? k : [""]).forEach(n => addRow(n, k.length ? cart[n].q : 1));
    ["e0", "e1", "e2"].forEach(x => $(x).hidden = true);["mn", "ma"].forEach(x => $(x).classList.remove("inv"));
    tampil(); calc(); $("mo").classList.add("on"); document.body.style.overflow = "hidden";
}
function tutup() { $("mo").classList.remove("on"); document.body.style.overflow = "" }

document.addEventListener("click", e => {
    const a = e.target.closest(".add");
    if (a) { const c = a.closest(".card"), n = c.dataset.n, p = +c.dataset.p; cart[n] = cart[n] || { p, q: 0 }; cart[n].q++; save(); badge(); toast("✅ " + n + " ditambahkan"); const w = document.querySelector(".wa"); w.classList.remove("bump"); void w.offsetWidth; w.classList.add("bump") }
    if (e.target.closest(".openc")) { e.preventDefault(); buka() }
});
$("mx").onclick = $("mcl").onclick = tutup;
$("mo").addEventListener("click", e => { if (e.target.id === "mo") tutup() });
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("mo").classList.contains("on")) tutup() });
$("am").onclick = () => { addRow("", 1); const r = $("rows").lastElementChild; r.scrollIntoView({ block: "nearest", behavior: "smooth" }); calc() };
$("rows").addEventListener("click", e => {
    const r = e.target.closest(".mrow"); if (!r) return;
    const s = e.target.closest("[data-s]"), inp = r.querySelector("input");
    if (s) { inp.value = Math.min(99, Math.max(1, (parseInt(inp.value) || 1) + (s.dataset.s === "+" ? 1 : -1))); paint(r); calc() }
    if (e.target.closest(".rm")) { if ($("rows").children.length > 1) r.remove(); else { r.querySelector("select").value = ""; inp.value = 1; paint(r) } calc() }
});
$("rows").addEventListener("change", e => { const r = e.target.closest(".mrow"); if (r) { paint(r); calc() } });
$("rows").addEventListener("input", e => { const r = e.target.closest(".mrow"); if (r && e.target.type === "number") { paint(r); calc() } });
document.querySelectorAll("input[name=jt]").forEach(r => r.onchange = tampil);
$("mn").oninput = () => { $("mn").classList.remove("inv"); $("e0").hidden = true };
$("ma").oninput = () => { $("ma").classList.remove("inv"); $("e2").hidden = true };

$("go").onclick = () => {
    const nm = $("mn").value.trim(), t = jenis(), ad = $("ma").value.trim(), o = items(), ks = Object.keys(o);
    $("mn").classList.toggle("inv", !nm); $("e0").hidden = !!nm;
    $("e1").hidden = ks.length > 0;
    const noAd = t === "Delivery" && !ad; $("ma").classList.toggle("inv", noAd); $("e2").hidden = !noAd;
    if (!nm || !ks.length || noAd) { const f = document.querySelector(".mb .inv,.mb .err:not([hidden])"); if (f) f.scrollIntoView({ block: "center", behavior: "smooth" }); return }
    if (!WA_NUMBER) { toast("Nomor WhatsApp warung belum diatur"); return }
    let tot = 0; const L = ks.map((n, i) => { const s = P[n].p * o[n]; tot += s; return `${i + 1}. ${n}\n    ${o[n]} x ${rp(P[n].p)} = ${rp(s)}` }).join("\n");
    const line = "━━━━━━━━━━━━━━", meja = $("mm").value.trim();
    const msg = `*PESANAN BARU - Bakso MAS Kembar*\n${line}\n*Nama:* ${nm}\n*Jenis:* ${t}\n` + (t === "Delivery" ? `*Alamat:* ${ad}\n` : (t === "Dine In" && meja ? `*No. meja:* ${meja}\n` : "")) + `${line}\n*Pesanan:*\n${L}\n${line}\n*TOTAL: ${rp(tot)}*` + (t === "Delivery" ? " (belum termasuk ongkir)" : "") + `\n\n*Catatan:* ${$("mc").value.trim() || "-"}`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    tutup();
};
badge();