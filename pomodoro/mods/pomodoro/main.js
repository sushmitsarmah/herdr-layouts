import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, notify, playSound, setShared, shared, theme } from "herdr";

// Edit these to taste: minutes per phase, and long break every N focus rounds.
const FOCUS_MIN = 25;
const BREAK_MIN = 5;
const LONG_BREAK_MIN = 15;
const LONG_EVERY = 4;

const today = () => new Date().toISOString().slice(0, 10);
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default class Pomodoro extends View {
  init() {
    this.phase = "focus";
    this.left = FOCUS_MIN * 60;
    this.ticker = null;
  }

  // Rounds finished today, kept in shared state so they survive a restart.
  rounds() {
    const r = shared("pomodoro.rounds");
    return r && r.day === today() ? r.count : 0;
  }

  length(phase) {
    if (phase === "focus") return FOCUS_MIN * 60;
    return (this.rounds() % LONG_EVERY === 0 && this.rounds() > 0 ? LONG_BREAK_MIN : BREAK_MIN) * 60;
  }

  start(cx) {
    if (this.ticker) return;
    // A clock is data: one tick a second, and only while it runs.
    this.ticker = cx.timer.every(1000, (cx) => {
      this.left = Math.max(0, this.left - 1);
      if (this.left === 0) this.finish(cx);
      cx.notify();
    });
    cx.notify();
  }

  pause(cx) {
    this.ticker?.cancel();
    this.ticker = null;
    cx.notify();
  }

  reset(cx) {
    this.pause(cx);
    this.left = this.length(this.phase);
  }

  skip(cx) {
    this.pause(cx);
    this.phase = this.phase === "focus" ? "break" : "focus";
    this.left = this.length(this.phase);
  }

  finish(cx) {
    this.pause(cx);
    if (this.phase === "focus") {
      setShared("pomodoro.rounds", { day: today(), count: this.rounds() + 1 });
      const busy = agents().filter((a) => a.status === "working").length;
      notify({ title: "Focus round done", body: busy ? `Take a break: ${busy} agent${busy === 1 ? " keeps" : "s keep"} working.` : "Take a break.", level: "success", timeout: 8000 });
    } else {
      notify({ title: "Break over", body: "Back to it.", level: "info", timeout: 8000 });
    }
    playSound("done");
    this.phase = this.phase === "focus" ? "break" : "focus";
    this.left = this.length(this.phase);
  }

  button(t, id, label, primary, onClick) {
    return div().id(id).flex_1().h(30).flex().items_center().justify_center().rounded(6).text_size(12).font_medium()
      .bg(primary ? t.solid : t.raised).text_color(primary ? t.solid_foreground : t.foreground)
      .hover((s) => s.opacity(0.85))
      .on_click((_e, cx) => onClick(cx))
      .child(label);
  }

  render() {
    const t = theme();
    const running = Boolean(this.ticker);
    const total = this.length(this.phase);
    const done = this.rounds();
    const accent = this.phase === "focus" ? t.accent : t.done;
    return v_flex().id("pomodoro").size_full().bg(t.chrome).p(16).gap(14).text_color(t.foreground)
      .child(h_flex().items_center().justify_between()
        .child(div().text_size(12).font_semibold().text_color(t.muted).child(this.phase === "focus" ? "FOCUS" : "BREAK"))
        .child(div().text_size(11).text_color(t.dim).child(`${done} today`)))
      .child(div().text_center().text_size(46).font_semibold().text_color(running ? t.foreground : t.muted).child(clock(this.left)))
      .child(div().relative().h(6).w_full().rounded(3).bg(t.surface)
        .child(div().absolute().left(0).top(0).h(6).rounded(3).bg(accent).w(`${Math.round(((total - this.left) / total) * 100)}%`).transition("width", 900)))
      .child(h_flex().gap(8)
        .child(this.button(t, "pomo-go", running ? "Pause" : "Start", true, (cx) => (running ? this.pause(cx) : this.start(cx))))
        .child(this.button(t, "pomo-reset", "Reset", false, (cx) => { this.reset(cx); cx.notify(); }))
        .child(this.button(t, "pomo-skip", "Skip", false, (cx) => { this.skip(cx); cx.notify(); })))
      .child(h_flex().gap(6).children(Array.from({ length: LONG_EVERY }, (_, i) =>
        div().flex_1().h(4).rounded(2).bg(i < done % LONG_EVERY || (done > 0 && done % LONG_EVERY === 0) ? accent : t.surface))))
      .child(div().text_size(11).text_color(t.dim).child(`${FOCUS_MIN} min focus · ${BREAK_MIN} min break · long break every ${LONG_EVERY}`));
  }
}
