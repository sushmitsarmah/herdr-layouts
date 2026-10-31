import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, panes, props, run, setAgentOrder, window as win } from "herdr";

const C = { paper: "#f4efe4", sheet: "#fbf8f1", ink: "#1d1b17", grey: "#6d665a", rule: "#1d1b17", red: "#a4161a", soft: "#d8cfbd" };
const ORDER = { blocked: 0, done: 1, working: 2, idle: 3 };
const KICKER = { blocked: "BREAKING", done: "FILED", working: "DEVELOPING", idle: "ON THE DESK" };
const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

function headline(a) {
  const who = a.program?.name ?? "Agent";
  if (a.status === "blocked") return `${who} halts work on “${a.tab_name}”, awaits your word`;
  if (a.status === "done") return `${who} files its story on “${a.tab_name}”`;
  if (a.status === "working") return `${who} digs into “${a.tab_name}”`;
  return `${who} standing by in ${a.space_name}`;
}
const rule = (h = 1) => div().h(h).w_full().flex_none().bg(C.rule);

export default class Newsroom extends View {
  init(_p, cx) {
    if (props()?.role === "masthead") cx.timer.every(60000, (cx) => cx.notify());
  }

  stories() {
    return [...agents()].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || b.seq - a.seq);
  }

  masthead() {
    const d = new Date();
    const list = agents();
    const w = win();
    return v_flex().id("newsroom-masthead").size_full().bg(C.paper).px(18).pt(10).gap(4).text_color(C.ink)
      .child(h_flex().items_center().text_size(10).text_color(C.grey)
        .child(div().pl(w.platform === "macos" ? 66 : 0).child("ALL THE WORK THAT'S FIT TO SHIP"))
        .child(div().flex_1())
        .child(div().child(`${list.filter((a) => a.status === "blocked").length} AWAITING THE EDITOR`))
        .when(w.buttons, (el) => el.children([["–", "window.minimize"], ["□", "window.maximize"], ["×", "window.close"]].map(([g, c]) =>
          div().id(`nr-${c}`).pl(10).on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(() => run(c)).child(g)))))
      .child(div().w_full().text_center().text_size(38).font_extrabold().child("The Daily Herd"))
      .child(rule(2))
      .child(h_flex().justify_between().text_size(10).font_semibold()
        .child(div().child(`${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`))
        .child(div().child(`${spaces().length} DESKS · ${list.length} CORRESPONDENTS`))
        .child(div().child("LATE EDITION")))
      .child(rule(1));
  }

  front() {
    const list = this.stories();
    setAgentOrder(list.map((a) => a.address));
    const [lead, ...rest] = list;
    const story = (a, big) => v_flex().id(`story-${a.address}`).gap(4).py(10).border_b(1).border_color(C.soft)
      .hover((s) => s.bg("#efe8d8")).on_click(() => run("agent.focus", { terminal: a.address }))
      .child(div().text_size(10).font_bold().text_color(a.status === "blocked" ? C.red : C.grey).child(KICKER[a.status] ?? "WIRE"))
      .child(div().text_size(big ? 26 : 16).font_bold().line_height(big ? "32px" : "21px").text_color(C.ink).child(headline(a)))
      .child(div().text_size(11).italic().text_color(C.grey).child(`By ${a.program?.name ?? "Agent"} · ${a.space_name} desk · ${a.address}`));
    return v_flex().size_full().bg(C.paper).overflow_y_scrollbar().pt(6)
      .when(!lead, (el) => el.child(v_flex().py(30).gap(6)
        .child(div().text_size(22).font_bold().text_color(C.ink).child("Slow news day"))
        .child(div().text_size(12).italic().text_color(C.grey).child("No agents on assignment. Start one and it makes the front page."))))
      .when(Boolean(lead), (el) => el.child(story(lead, true)))
      .children(rest.map((a) => story(a, false)));
  }

  section() {
    const space = spaces().find((s) => s.active);
    const tab = space?.tabs.find((t) => t.active);
    return h_flex().size_full().bg(C.paper).items_center().gap(10).text_color(C.ink)
      .child(div().px(6).py(1).bg(C.red).text_color("#ffffff").text_size(10).font_bold().child("LIVE"))
      .child(div().text_size(13).font_bold().child("THE WIRE"))
      .child(div().text_size(11).italic().text_color(C.grey).child(`${space?.name ?? ""} — ${tab?.name ?? ""}`));
  }

  pane() {
    const p = panes().find((x) => x.pane === props().pane);
    return h_flex().size_full().px(10).gap(8).items_center().bg(C.sheet).border_b(1).border_color(C.rule).text_color(C.ink)
      .on_click(() => p && run("pane.focus", { pane: p.pane }))
      .child(div().text_size(12).font_bold().child(p?.program?.name ?? "Terminal"))
      .child(div().flex_1().truncate().text_size(11).italic().text_color(C.grey).child(p?.title ?? ""))
      .when(Boolean(p?.status), (el) => el.child(div().text_size(10).font_bold().text_color(p.status === "blocked" ? C.red : C.grey).child(KICKER[p.status] ?? "")));
  }

  footer() {
    const list = this.stories();
    const ticker = list.length ? list.map((a) => `${KICKER[a.status] ?? "WIRE"}: ${a.program?.name ?? "Agent"} / ${a.tab_name}`).join("   ◆   ") : "NO WIRE TRAFFIC";
    return h_flex().size_full().bg(C.ink).px(18).items_center().gap(12).text_size(10).text_color(C.paper).overflow_hidden()
      .child(div().font_bold().text_color("#ffcf5a").child("WIRE"))
      .child(div().flex_1().truncate().child(ticker));
  }

  render() {
    const role = props()?.role;
    if (role === "masthead") return this.masthead();
    if (role === "section") return this.section();
    if (role === "pane") return this.pane();
    if (role === "footer") return this.footer();
    return this.front();
  }
}
