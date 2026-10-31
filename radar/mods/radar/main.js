import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, panes, props, run, setAgentOrder, window as win } from "herdr";

// Rings from the centre out. Agents that need you are pulled to the middle.
const C = { bg: "#04110f", panel: "#061815", line: "#14423a", grid: "#0f3a32", green: "#4dffc3", text: "#bfe9dc", dim: "#4f8b7d",
  blocked: "#ff5d5d", working: "#4dffc3", done: "#ffd166", idle: "#4f8b7d" };
const RING = { blocked: 0.22, working: 0.5, done: 0.72, idle: 0.92 };
const WORD = { blocked: "INBOUND", working: "TRACKING", done: "LANDED", idle: "HOLDING" };
const ORDER = { blocked: 0, working: 1, done: 2, idle: 3 };
const mono = (el) => el.font_family("Geist Mono");

// A stable bearing per agent, from its address, so blips don't jump around
// when other agents come and go.
function bearing(address) {
  let h = 0;
  for (const ch of address) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ((h % 360) * Math.PI) / 180;
}
const callsign = (a) => (a.program?.name ?? "AGENT").replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() + "-" + a.address.replace(/\W/g, "").slice(-3).toUpperCase();

export default class Radar extends View {
  init(_p, cx) {
    this.size = { width: 0, height: 0 };
    if (props()?.role === "top") cx.timer.every(30000, (cx) => cx.notify());
  }

  list() {
    return [...agents()].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));
  }

  scope() {
    const { width, height } = this.size;
    const d = Math.max(0, Math.min(width, height) - 36);
    const cx0 = width / 2, cy0 = height / 2;
    const ring = (f) => div().absolute().left(cx0 - (d * f) / 2).top(cy0 - (d * f) / 2).size(d * f).rounded_full().border(1).border_color(C.grid);
    const list = this.list();
    setAgentOrder(list.map((a) => a.address));
    return div().id("root").relative().size_full().bg(C.bg).overflow_hidden()
      .on_size_change((size, cx) => { this.size = size; cx.notify(); })
      .when(d > 40, (el) => el
        .children([1, 0.75, 0.5, 0.25].map(ring))
        .child(div().absolute().left(cx0).top(cy0 - d / 2).w(1).h(d).bg(C.grid))
        .child(div().absolute().top(cy0).left(cx0 - d / 2).h(1).w(d).bg(C.grid))
        .child(svg("mods/radar/sweep.svg").absolute().left(cx0 - d / 2).top(cy0 - d / 2).size(d).text_color(C.green).spin(4000))
        .children(list.map((a) => {
          const r = (d / 2) * (RING[a.status] ?? 0.92);
          const angle = bearing(a.address);
          const x = cx0 + Math.sin(angle) * r, y = cy0 - Math.cos(angle) * r;
          const color = C[a.status] ?? C.dim;
          return div().id(`blip-${a.address}`).absolute().left(x - 6).top(y - 6)
            .on_click(() => run("agent.focus", { terminal: a.address }))
            .child(div().size(12).rounded_full().bg(color).when(a.status === "blocked", (e) => e.loop("opacity", { from: 0.25, to: 1, period: 700 })))
            .child(mono(div()).absolute().left(16).top(-3).text_size(10).text_color(color).whitespace_nowrap().child(callsign(a)));
        })))
      .child(mono(div()).absolute().left(12).bottom(8).text_size(10).text_color(C.dim).child("CENTRE: NEEDS YOU · OUTER: HOLDING"));
  }

  top() {
    const list = agents();
    const n = (s) => list.filter((a) => a.status === s).length;
    const w = win();
    const now = new Date();
    const zulu = `${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}Z`;
    return mono(h_flex()).id("radar-top").size_full().pl(w.platform === "macos" ? 84 : 16).pr(12).gap(14).items_center()
      .bg(C.bg).border_b(1).border_color(C.line).text_size(11).text_color(C.dim)
      .child(v_flex().child(div().text_size(16).font_bold().text_color(C.green).child("HERDR APPROACH"))
        .child(div().child(`${spaces().find((s) => s.active)?.name ?? "—"} · ${zulu}`)))
      .child(div().flex_1())
      .child(div().text_color(C.blocked).child(`${n("blocked")} INB`))
      .child(div().text_color(C.working).child(`${n("working")} TRK`))
      .child(div().text_color(C.done).child(`${n("done")} LND`))
      .when(w.buttons, (el) => el.children([["–", "window.minimize"], ["□", "window.maximize"], ["×", "window.close"]].map(([g, c]) =>
        div().id(`rd-${c}`).px(5).on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(() => run(c)).child(g))));
  }

  contacts() {
    const list = this.list();
    return mono(v_flex()).size_full().bg(C.panel).border_t(1).border_color(C.line).text_size(11)
      .child(h_flex().h(26).flex_none().px(12).gap(8).items_center().text_color(C.dim).border_b(1).border_color(C.line)
        .child(div().w(90).child("CALLSIGN")).child(div().flex_1().child("SECTOR / TAB")).child(div().w(70).child("STATUS")))
      .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar()
        .when(list.length === 0, (el) => el.child(div().p(12).text_color(C.dim).child("NO CONTACTS. START AN AGENT.")))
        .children(list.map((a) => h_flex().id(`row-${a.address}`).h(24).flex_none().px(12).gap(8).items_center()
          .bg(a.focused ? "#0d2f29" : C.panel).hover((s) => s.bg("#0b2722"))
          .on_click(() => run("agent.focus", { terminal: a.address }))
          .child(div().w(90).text_color(C[a.status] ?? C.dim).child(callsign(a)))
          .child(div().flex_1().truncate().text_color(C.text).child(`${a.space_name} / ${a.tab_name}`))
          .child(div().w(70).text_color(C[a.status] ?? C.dim).child(WORD[a.status] ?? a.status)))));
  }

  pane() {
    const p = panes().find((x) => x.pane === props().pane);
    const icon = p?.program?.icon ? (p.program.tint ? svg(p.program.icon).text_color(C.green) : image(p.program.icon)).size(13).flex_none() : null;
    return mono(h_flex()).size_full().px(10).gap(8).items_center().bg("#082520").border_b(1).border_color(C.line).text_size(11)
      .on_click(() => p && run("pane.focus", { pane: p.pane }))
      .when(Boolean(icon), (el) => el.child(icon))
      .child(div().text_color(p?.focused ? C.green : C.text).child((p?.program?.name ?? "TERMINAL").toUpperCase()))
      .child(div().flex_1().truncate().text_color(C.dim).child(p?.cwd ?? ""))
      .when(Boolean(p?.status), (el) => el.child(div().text_color(C[p.status] ?? C.dim).child(WORD[p.status] ?? p.status)));
  }

  render() {
    const role = props()?.role;
    if (role === "top") return this.top();
    if (role === "contacts") return this.contacts();
    if (role === "pane") return this.pane();
    return this.scope();
  }
}
