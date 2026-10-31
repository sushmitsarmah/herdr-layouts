import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, panes, props, run, setAgentOrder, window as win } from "herdr";

const C = { bg: "#07020f", panel: "#120826", line: "#3b1d66", pink: "#ff2bd6", cyan: "#29f0ff", yellow: "#ffe95c", green: "#5cff8d", red: "#ff4b4b", dim: "#8a72b3", text: "#f2e9ff" };
const COLOR = { working: C.cyan, blocked: C.red, done: C.green, idle: C.dim };
const STATE = { working: "PLAYING", blocked: "CONTINUE?", done: "STAGE CLEAR", idle: "READY" };
const mono = (el) => el.font_family("JetBrains Mono");

// Score: 10 points per second an agent's tab has been working, plus a bonus
// for every finished stage. Bonuses are counted while Herdr runs.
const BONUS = 5000;

export default class Arcade extends View {
  init(_p, cx) {
    this.cleared = {};
    this.last = {};
    const role = props()?.role;
    if (!role || role === "marquee") cx.timer.every(5000, (cx) => cx.notify());
  }

  tabOf(a) {
    for (const s of spaces()) for (const t of s.tabs) if (t.id === a.tab) return t;
    return null;
  }

  score(a) {
    if (this.last[a.address] !== a.status) {
      if (a.status === "done" && this.last[a.address] === "working") this.cleared[a.address] = (this.cleared[a.address] ?? 0) + 1;
      this.last[a.address] = a.status;
    }
    const since = this.tabOf(a)?.working_since;
    const playing = a.status === "working" && since ? Math.floor((Date.now() - since) / 100) : 0;
    return playing + (this.cleared[a.address] ?? 0) * BONUS;
  }

  ranked() {
    return agents().map((a) => ({ a, score: this.score(a) })).sort((x, y) => y.score - x.score);
  }

  marquee() {
    const w = win();
    const list = this.ranked();
    const hi = list[0]?.score ?? 0;
    return mono(h_flex()).id("arcade-marquee").size_full().bg(C.bg).pl(w.platform === "macos" ? 84 : 20).pr(16).gap(22).items_center()
      .border_b(2).border_color(C.pink)
      .child(v_flex().child(div().text_size(10).text_color(C.dim).child("HI-SCORE")).child(div().text_size(20).font_bold().text_color(C.yellow).child(String(hi).padStart(7, "0"))))
      .child(div().flex_1())
      .child(v_flex().items_center()
        .child(div().text_size(30).font_extrabold().text_color(C.pink).child("HERDR ARCADE"))
        .child(div().text_size(11).text_color(C.cyan).frames(list.length ? ["▶ PRESS START", "  PRESS START"] : ["INSERT AGENT", "            "], 600)))
      .child(div().flex_1())
      .child(v_flex().items_end().child(div().text_size(10).text_color(C.dim).child("CREDITS")).child(div().text_size(20).font_bold().text_color(C.yellow).child(String(spaces().length).padStart(2, "0"))))
      .when(w.buttons, (el) => el.children([["–", "window.minimize"], ["□", "window.maximize"], ["×", "window.close"]].map(([g, c]) =>
        div().id(`ar-${c}`).px(4).text_color(C.dim).on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(() => run(c)).child(g))));
  }

  scores() {
    const list = this.ranked();
    setAgentOrder(list.map(({ a }) => a.address));
    return mono(v_flex()).size_full().bg(C.panel).rounded(12).border(2).border_color(C.line).p(14).gap(6)
      .child(div().text_center().text_size(16).font_bold().text_color(C.yellow).child("— HIGH SCORES —"))
      .child(h_flex().gap(8).text_size(10).text_color(C.dim).child(div().w(32).child("RNK")).child(div().flex_1().child("PLAYER / STAGE")).child(div().w(84).text_right().child("SCORE")))
      .child(v_flex().flex_1().min_h(0).gap(4).overflow_y_scrollbar()
        .when(list.length === 0, (el) => el.child(div().pt(30).text_center().text_size(12).text_color(C.dim).child("NO PLAYERS. START AN AGENT.")))
        .children(list.map(({ a, score }, i) => {
          const color = COLOR[a.status] ?? C.dim;
          return v_flex().id(`player-${a.address}`).px(8).py(6).rounded(6).bg(a.focused ? "#24104a" : "#00000000").hover((s) => s.bg("#1c0c3a"))
            .on_click(() => run("agent.focus", { terminal: a.address }))
            .child(h_flex().gap(8).items_center()
              .child(div().w(32).text_size(13).font_bold().text_color(i === 0 ? C.yellow : C.text).child(["1ST", "2ND", "3RD"][i] ?? `${i + 1}TH`))
              .child(div().flex_1().truncate().text_size(13).text_color(C.text).child((a.program?.name ?? "AGENT").toUpperCase()))
              .child(div().w(84).text_right().text_size(13).text_color(C.yellow).child(String(score).padStart(7, "0"))))
            .child(h_flex().gap(8).pl(40).text_size(10)
              .child(div().flex_1().truncate().text_color(C.dim).child(`${a.space_name} / ${a.tab_name}`))
              .child(div().text_color(color)
                .when(a.status === "blocked", (el) => el.frames(["CONTINUE? 9", "CONTINUE? 8", "CONTINUE? 7", "CONTINUE? 6", "CONTINUE? 5", "CONTINUE? 4", "CONTINUE? 3", "CONTINUE? 2", "CONTINUE? 1"], 1000))
                .when(a.status !== "blocked", (el) => el.child(STATE[a.status] ?? a.status))));
        })));
  }

  pane() {
    const p = panes().find((x) => x.pane === props().pane);
    const peers = panes().filter((x) => x.tab === p?.tab);
    const n = Math.max(1, peers.findIndex((x) => x.pane === p?.pane) + 1);
    return mono(h_flex()).size_full().px(12).gap(10).items_center().bg(C.panel).border_b(1).border_color(C.line).text_size(11)
      .on_click(() => p && run("pane.focus", { pane: p.pane }))
      .child(div().font_bold().text_color(p?.focused ? C.pink : C.dim).child(`${n}P`))
      .child(div().text_color(C.text).child((p?.program?.name ?? "TERMINAL").toUpperCase()))
      .child(div().flex_1())
      .when(Boolean(p?.status), (el) => el.child(div().text_color(COLOR[p.status] ?? C.dim).child(STATE[p.status] ?? "")));
  }

  controls() {
    const mac = win()?.platform === "macos";
    const key = (k, label) => h_flex().gap(6).items_center().child(div().px(5).rounded(3).bg(C.line).text_color(C.text).child(k)).child(div().child(label));
    return mono(h_flex()).size_full().px(20).gap(22).items_center().bg(C.bg).border_t(1).border_color(C.line).text_size(10).text_color(C.dim)
      .child(key(mac ? "CMD ]" : "ALT ↓", "NEXT PLAYER")).child(key(mac ? "CMD [" : "ALT ↑", "PREV PLAYER")).child(key(mac ? "CMD T" : "CTRL SHIFT T", "NEW STAGE"))
      .child(div().flex_1()).child(div().text_color(C.pink).child("© HERDR ARCADE · FREE PLAY"));
  }

  render() {
    const role = props()?.role;
    if (role === "marquee") return this.marquee();
    if (role === "pane") return this.pane();
    if (role === "controls") return this.controls();
    return this.scores();
  }
}
