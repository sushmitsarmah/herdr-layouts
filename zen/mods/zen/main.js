import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, spaces, focused, props, run, theme, setAgentOrder, window as win } from "herdr";

// The order agents are walked in: most urgent first, so agent.next lands on
// whoever needs you before whoever is busy.
const ORDER = { blocked: 0, done: 1, working: 2, idle: 3 };
const WORD = { blocked: "needs you", done: "done", working: "working", idle: "idle" };
const tint = (t, s) => t[s] ?? t.unknown ?? t.muted;

function sorted() {
  return [...agents()].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || a.seq - b.seq);
}

export default class Zen extends View {
  init() {
    this.mode = "agent";
  }

  button(t, id, label, onClick) {
    return div().id(id).px(8).h(24).flex().items_center().rounded(6).text_size(12).text_color(t.muted)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); onClick(cx); })
      .child(label);
  }

  toggle(cx) {
    this.mode = this.mode === "agent" ? "tab" : "agent";
    run("layout.select", { stack: "zen-body", child: this.mode === "agent" ? "zen-agent" : "zen-tab" });
    cx.notify();
  }

  top(t) {
    const list = agents();
    const f = focused();
    const space = spaces().find((s) => s.active);
    const tab = space?.tabs.find((x) => x.active);
    const shown = list.find((a) => a.address === f?.agent) ?? list.find((a) => a.focused) ?? list[0];
    const waiting = list.filter((a) => a.status === "blocked").length;
    const w = win();
    return h_flex().id("zen-top").size_full().pl(w.platform === "macos" && !w.fullscreen ? 84 : 18).pr(18).gap(10).items_center()
      .bg(t.background).text_size(12).text_color(t.muted)
      .child(div().flex_none().truncate().max_w(280).child(`${space?.name ?? "herdr"} / ${tab?.name ?? ""}`))
      .child(div().flex_1())
      .when(Boolean(shown), (el) => el
        .child(div().size(7).rounded(4).flex_none().bg(tint(t, shown.status)))
        .child(div().text_color(t.foreground).font_medium().child(shown.program?.name ?? "agent"))
        .child(div().child(`${shown.tab_name} · ${WORD[shown.status] ?? shown.status}`)))
      .when(!shown, (el) => el.child(div().child("No agents yet: start one in a terminal")))
      .child(div().flex_1())
      .when(waiting > 0, (el) => el.child(div().px(8).py(2).rounded(5).bg(t.blocked + "22").text_color(t.blocked).font_semibold()
        .child(`${waiting} need${waiting === 1 ? "s" : ""} you`)))
      .child(this.button(t, "zen-prev", "‹", () => run("agent.prev")))
      .child(this.button(t, "zen-next", "›", () => run("agent.next")))
      .child(this.button(t, "zen-mode", this.mode === "agent" ? "Show tab" : "Show agent", (cx) => this.toggle(cx)))
      .when(w.buttons, (el) => el
        .child(this.button(t, "zen-min", "–", () => run("window.minimize")))
        .child(this.button(t, "zen-max", w.maximized ? "❐" : "□", () => run("window.maximize")))
        .child(this.button(t, "zen-close", "×", () => run("window.close"))));
  }

  dots(t) {
    const list = sorted();
    setAgentOrder(list.map((a) => a.address));
    const f = focused();
    const current = f?.agent ?? list.find((a) => a.focused)?.address;
    return h_flex().size_full().justify_center().items_center().gap(10).bg(t.background)
      .children(list.map((a) => {
        const on = a.address === current;
        return div().id(`zen-dot-${a.address}`).size(on ? 12 : 9).rounded(6).flex_none().bg(tint(t, a.status))
          .opacity(on || a.status === "blocked" ? 1 : 0.55)
          .when(a.status === "blocked", (el) => el.loop("opacity", { from: 0.35, to: 1, period: 1100 }))
          .hover((s) => s.opacity(1))
          .on_click(() => run("agent.focus", { terminal: a.address }));
      }));
  }

  render() {
    const t = theme();
    return props()?.role === "top" ? this.top(t) : this.dots(t);
  }
}
