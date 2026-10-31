import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, spaces, run, theme } from "herdr";

// One line along the bottom of your window: a count per status and a pill
// per agent, most urgent first. Click a pill to go to that agent.
const ORDER = { blocked: 0, done: 1, working: 2, idle: 3 };
const WORD = { blocked: "need you", done: "done", working: "working", idle: "idle" };
const MAX_PILLS = 12;

function workingFor(a) {
  for (const s of spaces()) for (const t of s.tabs) if (t.id === a.tab && t.working_since) {
    const m = Math.floor((Date.now() - t.working_since) / 60000);
    return m < 1 ? "<1m" : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
  }
  return "";
}

export default class AgentTicker extends View {
  init(_p, cx) {
    // The elapsed minutes are data: refresh them twice a minute.
    cx.timer.every(30000, (cx) => cx.notify());
  }

  render() {
    const t = theme();
    const list = [...agents()].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || b.seq - a.seq);
    const n = (s) => list.filter((a) => a.status === s).length;
    const count = (s) => h_flex().id(`at-count-${s}`).gap(5).items_center().px(6).rounded(4)
      .hover((x) => x.bg(t.hover))
      .on_click(() => { const a = list.find((x) => x.status === s); if (a) run("agent.focus", { terminal: a.address }); })
      .child(div().size(7).rounded(4).bg(t[s])).child(div().text_color(n(s) ? t.foreground : t.dim).child(`${n(s)} ${WORD[s]}`));
    return h_flex().id("agent-ticker").size_full().px(10).gap(6).items_center().bg(t.chrome).border_t(1).border_color(t.border)
      .text_size(11).text_color(t.muted).overflow_hidden()
      .child(count("blocked")).child(count("working")).child(count("done"))
      .child(div().w(1).h(14).bg(t.border).mx(4))
      .when(list.length === 0, (el) => el.child(div().text_color(t.dim).child("No agents running")))
      .children(list.slice(0, MAX_PILLS).map((a) => {
        const pic = a.program?.icon ? (a.program.tint ? svg(a.program.icon).text_color(t.muted) : image(a.program.icon)).size(12).flex_none() : null;
        const extra = a.status === "working" ? workingFor(a) : "";
        return h_flex().id(`at-${a.address}`).h(20).px(7).gap(5).items_center().flex_none().rounded(10)
          .bg(a.focused ? t.selected : t.surface).border(1).border_color(a.status === "blocked" ? t.blocked : t.border)
          .hover((x) => x.bg(t.hover))
          .on_click(() => run("agent.focus", { terminal: a.address }))
          .when(Boolean(pic), (el) => el.child(pic))
          .child(div().max_w(140).truncate().text_color(t.foreground).child(a.tab_name))
          .child(div().size(6).rounded(3).bg(t[a.status] ?? t.dim).when(a.status === "blocked", (el) => el.loop("opacity", { from: 0.3, to: 1, period: 900 })))
          .when(Boolean(extra), (el) => el.child(div().text_color(t.dim).child(extra)));
      }))
      .when(list.length > MAX_PILLS, (el) => el.child(div().text_color(t.dim).child(`+${list.length - MAX_PILLS}`)));
  }
}
