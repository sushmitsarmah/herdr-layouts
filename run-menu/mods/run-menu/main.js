import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { closeOverlay, focused, props, run, theme } from "herdr";

// Your launchers. Each is [key, label, command, place]; place is "right", "down"
// or "tab". A null command opens a plain shell. Commands run through sh in the
// focused pane's folder, and the pane drops to your shell when they finish
// (a pane whose program exits closes). Edit freely: this list is the whole mod.
const ITEMS = [
  ["s", "Shell to the right", null, "right"],
  ["d", "Shell below", null, "down"],
  ["g", "git status", "git status", "down"],
  ["l", "git log --graph", "git log --graph --oneline --decorate -n 60", "right"],
  ["t", "Run tests (npm test)", "npm test", "down"],
  ["b", "Build (make)", "make", "down"],
  ["w", "Watch files (ls every 2 s)", "watch -n 2 ls -la", "right"],
  ["h", "htop", "htop", "tab"],
];
const hold = (cmd) => ["sh", "-c", `${cmd}; exec "\${SHELL:-sh}"`];
// Hold Shift with a key to open it in a new tab instead.

export default class RunMenu extends View {
  init(_props, cx) {
    this.handle = cx.focus_handle();
    this.handle.focus();
    this.sel = 0;
  }

  dismiss() {
    closeOverlay(props().overlay);
  }

  launch(item, asTab = false) {
    const [, , argv, place] = item;
    const folder = focused()?.cwd ?? undefined;
    this.dismiss();
    const args = { place: asTab ? "tab" : place };
    if (argv) args.argv = hold(argv);
    if (folder) args.folder = folder;
    run("terminal.open", args);
  }

  key(e, cx) {
    cx.stop_propagation();
    const k = e.key;
    if (k === "escape") return this.dismiss();
    if (k === "down") { this.sel = (this.sel + 1) % ITEMS.length; return cx.notify(); }
    if (k === "up") { this.sel = (this.sel - 1 + ITEMS.length) % ITEMS.length; return cx.notify(); }
    if (k === "enter") return this.launch(ITEMS[this.sel], e.modifiers.shift);
    const item = !e.modifiers.control && !e.modifiers.alt && ITEMS.find((i) => i[0] === k.toLowerCase());
    if (item) return this.launch(item, e.modifiers.shift);
  }

  render() {
    const t = theme();
    const cwd = focused()?.cwd ?? "";
    return v_flex().id("run-menu").track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .p(14).gap(8).bg(t.popover).text_color(t.foreground).text_size(12)
      .child(h_flex().justify_between().items_center()
        .child(div().font_semibold().child("Run"))
        .child(div().text_color(t.muted).child("key or Enter · Shift: new tab · Esc")))
      .child(div().truncate().text_size(11).text_color(t.dim).child(cwd ? `in ${cwd}` : "in the focused pane's folder"))
      .child(v_flex().h(290).min_h(0).gap(1).overflow_y_scrollbar().children(ITEMS.map((item, i) => {
        const [key, label, argv, place] = item;
        return h_flex().id(`rm-${key}`).h(30).flex_none().px(8).gap(10).items_center().rounded(6)
          .bg(i === this.sel ? t.selected : "#00000000").hover((s) => s.bg(t.hover))
          .on_click((e) => this.launch(item, Boolean(e?.modifiers?.shift)))
          .child(div().w(20).h(20).flex().items_center().justify_center().rounded(4).bg(t.raised).text_color(t.accent).font_semibold().child(key))
          .child(div().flex_1().truncate().child(label))
          .child(div().text_size(11).text_color(t.dim).child(argv ? place : `shell · ${place}`));
      })));
  }
}
