import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, closeOverlay, nextCommand, props, run, theme } from "herdr";

// Who comes first: blocked, then finished-while-away, then working. Idle
// agents are left out; flip SHOW_IDLE to list them too.
const ORDER = { blocked: 0, done: 1, working: 2, idle: 3 };
const SHOW_IDLE = false;
const WORD = { blocked: "needs you", done: "finished", working: "working", idle: "idle" };

function list() {
  return agents().filter((a) => SHOW_IDLE || a.status !== "idle")
    .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || b.seq - a.seq);
}

export default class NeedsYou extends View {
  init(_props, cx) {
    this.handle = cx.focus_handle();
    this.handle.focus();
    this.sel = 0;
    // Pressing the opener again while open moves down the list.
    cx.spawn(async (cx) => {
      for (;;) {
        await nextCommand();
        this.move(1, cx);
      }
    });
  }

  dismiss() {
    closeOverlay(props().overlay);
  }

  go(a) {
    if (!a) return this.dismiss();
    this.dismiss();
    run("agent.focus", { terminal: a.address });
  }

  move(d, cx) {
    const n = list().length;
    if (n) this.sel = (this.sel + d + n) % n;
    cx.notify();
  }

  key(e, cx) {
    cx.stop_propagation();
    const items = list();
    const k = e.key;
    if (k === "escape") return this.dismiss();
    if (k === "down" || k === "j" || k === "tab") return this.move(1, cx);
    if (k === "up" || k === "k") return this.move(-1, cx);
    if (k === "enter") return this.go(items[this.sel]);
    if (/^[1-9]$/.test(k)) return this.go(items[Number(k) - 1]);
  }

  render() {
    const t = theme();
    const items = list();
    if (this.sel >= items.length) this.sel = Math.max(0, items.length - 1);
    const waiting = items.filter((a) => a.status === "blocked").length;
    return v_flex().id("needs-you").track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .p(14).gap(10).bg(t.popover).text_color(t.foreground).text_size(12)
      .child(h_flex().justify_between().items_center()
        .child(div().font_semibold().child(waiting ? `${waiting} agent${waiting === 1 ? "" : "s"} need${waiting === 1 ? "s" : ""} you` : "Nobody is waiting on you"))
        .child(div().text_color(t.muted).child("↑↓ choose · Enter go · 1–9 jump · Esc")))
      .child(v_flex().h(290).min_h(0).gap(2).overflow_y_scrollbar()
        .when(items.length === 0, (el) => el.child(div().p(16).text_color(t.muted).child("No busy or waiting agents right now.")))
        .children(items.map((a, i) => {
          const pic = a.program?.icon ? (a.program.tint ? svg(a.program.icon).text_color(t.muted) : image(a.program.icon)).size(16).flex_none() : div().size(16).flex_none();
          const color = t[a.status] ?? t.muted;
          return h_flex().id(`ny-${a.address}`).h(40).flex_none().px(10).gap(10).items_center().rounded(6)
            .bg(i === this.sel ? t.selected : "#00000000").hover((s) => s.bg(t.hover))
            .on_click(() => this.go(a))
            .child(div().w(14).text_color(t.dim).child(i < 9 ? String(i + 1) : ""))
            .child(pic)
            .child(v_flex().flex_1().min_w(0)
              .child(div().truncate().font_medium().child(a.tab_name))
              .child(div().truncate().text_size(11).text_color(t.dim).child(`${a.program?.name ?? "agent"} · ${a.space_name}`)))
            .child(h_flex().gap(6).items_center().flex_none()
              .child(div().size(7).rounded(4).bg(color).when(a.status === "blocked", (el) => el.loop("opacity", { from: 0.3, to: 1, period: 900 })))
              .child(div().text_size(11).text_color(color).child(WORD[a.status] ?? a.status)));
        })));
  }
}
