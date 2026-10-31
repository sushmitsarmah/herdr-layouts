import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, panes, props, run, theme, window as win } from "herdr";

// How far back the lanes reach, and how wide the label column is.
const WINDOW_MS = 30 * 60 * 1000;
const LABEL_W = 220;
const WORD = { blocked: "needs you", done: "done", working: "working", idle: "idle" };

// One history for every copy of the mod (lanes, ruler, headers), kept for the
// life of the app: tab id -> [{ status, from, to }]. Status changes are only
// seen while Herdr runs, so older time stays empty.
const HISTORY = new Map();

function record(tab) {
  const now = Date.now();
  const list = HISTORY.get(tab.id) ?? [];
  const last = list[list.length - 1];
  const status = tab.status ?? "none";
  if (!last || last.status !== status) {
    if (last) last.to = now;
    const from = status === "working" && tab.working_since ? Math.max(tab.working_since, now - WINDOW_MS) : now;
    list.push({ status, from: last ? now : from, to: null });
  }
  while (list.length > 1 && (list[0].to ?? now) < now - WINDOW_MS) list.shift();
  HISTORY.set(tab.id, list);
  return list;
}

const ago = (ms) => (ms < 60000 ? "now" : `${Math.round(ms / 60000)}m`);

export default class Timeline extends View {
  init(_p, cx) {
    this.width = 0;
    // Data, not animation: the lanes slide left once every 15 seconds.
    if (!props()?.role || props()?.role === "ruler") cx.timer.every(15000, (cx) => cx.notify());
  }

  rows() {
    return spaces().flatMap((s) => s.tabs.map((tab) => ({ space: s, tab })));
  }

  lanes(t) {
    const now = Date.now();
    const track = Math.max(1, this.width - LABEL_W - 32);
    const rows = this.rows();
    return v_flex().id("root").size_full().bg(t.canvas).px(16).py(10).gap(4).overflow_y_scrollbar()
      .on_size_change((size, cx) => { this.width = size.width; cx.notify(); })
      .when(rows.length === 0, (el) => el.child(div().p(20).text_color(t.muted).child("No tabs yet.")))
      .children(rows.map(({ space, tab }) => {
        const segs = record(tab);
        const shown = space.active && tab.active;
        return h_flex().id(`lane-${tab.id}`).h(26).flex_none().items_center().rounded(6)
          .bg(shown ? t.selected : "#00000000").hover((s) => s.bg(t.hover))
          .on_click(() => { run("space.select", { id: space.id }); run("tab.select", { id: tab.id }); })
          .child(h_flex().w(LABEL_W).flex_none().px(8).gap(8).items_center().text_size(12)
            .child(div().size(7).rounded(4).flex_none().bg(t[tab.status] ?? t.dim))
            .child(div().truncate().text_color(t.muted).child(space.name))
            .child(div().text_color(t.dim).child("/"))
            .child(div().truncate().text_color(shown ? t.foreground : t.muted).font_medium().child(tab.name)))
          .child(div().relative().w(track).h(10).rounded(5).bg(t.surface)
            .children(segs.filter((s) => s.status !== "none" && s.status !== "idle").map((s, i) => {
              const from = Math.max(s.from, now - WINDOW_MS);
              const left = ((from - (now - WINDOW_MS)) / WINDOW_MS) * track;
              const width = Math.max(3, (((s.to ?? now) - from) / WINDOW_MS) * track);
              return div().absolute().top(0).h(10).rounded(5).left(left).w(width).bg(t[s.status] ?? t.dim)
                .when(s.status === "blocked" && !s.to, (el) => el.loop("opacity", { from: 0.4, to: 1, period: 1000 }));
            })));
      }));
  }

  top(t) {
    const all = this.rows().map((r) => r.tab);
    const n = (s) => all.filter((x) => x.status === s).length;
    const w = win();
    const chip = (s) => h_flex().gap(6).items_center().child(div().size(8).rounded(4).bg(t[s])).child(div().child(`${n(s)} ${WORD[s]}`));
    return h_flex().id("timeline-top").size_full().pl(w.platform === "macos" ? 84 : 18).pr(14).gap(18).items_center()
      .bg(t.chrome).border_b(1).border_color(t.border).text_size(12).text_color(t.muted)
      .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Timeline"))
      .child(div().child(`${all.length} tabs · last ${WINDOW_MS / 60000} minutes`))
      .child(div().flex_1())
      .children(["blocked", "working", "done"].map(chip))
      .when(w.buttons, (el) => el.children([["–", "window.minimize"], ["□", "window.maximize"], ["×", "window.close"]].map(([g, c]) =>
        div().id(`tl-${c}`).px(6).rounded(4).hover((s) => s.bg(t.hover)).on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click(() => run(c)).child(g))));
  }

  ruler(t) {
    const marks = [30, 20, 10, 0];
    return h_flex().id("root").size_full().bg(t.canvas).px(16).items_center().text_size(10).text_color(t.dim).border_b(1).border_color(t.border)
      .on_size_change((size, cx) => { this.width = size.width; cx.notify(); })
      .child(div().w(LABEL_W).flex_none().px(8).child("TAB"))
      .child(h_flex().flex_1().justify_between().pr(16).children(marks.map((m) => div().child(m ? `−${m}m` : "now"))));
  }

  pane(t) {
    const p = panes().find((x) => x.pane === props().pane);
    const icon = p?.program?.icon ? (p.program.tint ? svg(p.program.icon).text_color(t.muted) : image(p.program.icon)).size(14).flex_none() : null;
    const segs = p ? HISTORY.get(p.tab) ?? [] : [];
    const since = segs.length ? Date.now() - segs[segs.length - 1].from : 0;
    return h_flex().size_full().px(10).gap(8).items_center().bg(t.surface).border_b(1).border_color(t.border).text_size(11)
      .on_click(() => p && run("pane.focus", { pane: p.pane }))
      .when(Boolean(icon), (el) => el.child(icon))
      .child(div().font_medium().text_color(t.foreground).child(p?.program?.name ?? "terminal"))
      .child(div().flex_1().truncate().text_color(t.dim).child(p?.branch ? `⎇ ${p.branch}` : ""))
      .when(Boolean(p?.status), (el) => el.child(div().text_color(t[p.status] ?? t.muted).child(`${WORD[p.status] ?? p.status} · ${ago(since)}`)));
  }

  render() {
    const t = theme();
    const role = props()?.role;
    if (role === "top") return this.top(t);
    if (role === "ruler") return this.ruler(t);
    if (role === "pane") return this.pane(t);
    return this.lanes(t);
  }
}
