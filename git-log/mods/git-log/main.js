import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { exec, focused, home, panes, run, spaces, theme } from "herdr";

// How many commits to list, and how often to look again while shown.
const COUNT = 40;
const REFRESH_MS = 20000;
const SEP = "\u001f";

const short = (p) => {
  const h = home();
  return !p ? "" : p === h ? "~" : p.startsWith(h + "/") ? "~" + p.slice(h.length) : p;
};

// The folder to read: the focused pane's live folder, else the space's.
function where() {
  const f = focused();
  const space = spaces().find((s) => s.id === f?.space) ?? spaces().find((s) => s.active);
  const pane = panes().find((p) => p.pane === f?.pane);
  return { cwd: f?.cwd ?? pane?.cwd ?? space?.folder ?? null, machine: space?.machine ?? null };
}

export default class GitLog extends View {
  init(_p, cx) {
    this.key = null;
    this.commits = [];
    this.branch = "";
    this.error = "";
    this.loading = false;
    // Follow focus cheaply: compare the folder every 1.5 s (no git run unless it
    // changed), and run git again every REFRESH_MS for new commits.
    this.load(cx);
    cx.timer.every(1500, (cx) => this.load(cx));
    cx.timer.every(REFRESH_MS, (cx) => this.load(cx, true));
  }

  load(cx, force = false) {
    const { cwd, machine } = where();
    const key = `${machine ?? ""}:${cwd ?? ""}`;
    if (!cwd || (!force && key === this.key) || this.loading) return;
    this.key = key;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        const opts = { cwd, on: machine };
        const [log, br] = await Promise.all([
          exec("git", ["log", `-n${COUNT}`, `--format=%h${SEP}%an${SEP}%ar${SEP}%s${SEP}%D`], opts),
          exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], opts),
        ]);
        if (log.code !== 0) {
          this.commits = [];
          this.error = /not a git repository/.test(log.stderr) ? "Not a git repository"
            : /does not have any commits/.test(log.stderr) ? "No commits yet"
            : log.stderr.trim().split("\n")[0];
        } else {
          this.error = "";
          this.branch = br.stdout.trim();
          this.commits = log.stdout.split("\n").filter(Boolean).map((l) => {
            const [hash, author, when, subject, refs] = l.split(SEP);
            return { hash, author, when, subject, refs };
          });
        }
      } catch (e) {
        this.commits = [];
        this.error = "git isn't available here";
      }
      this.loading = false;
      cx.notify();
    });
  }

  show(c) {
    // A new split beside the focused pane, paging through the commit.
    run("terminal.open", { argv: ["sh", "-c", 'git show --stat --patch "$1"; exec "${SHELL:-sh}"', "sh", c.hash], folder: where().cwd, place: "right" });
  }

  render() {
    const t = theme();
    const { cwd } = where();
    return v_flex().id("git-log").size_full().bg(t.chrome).text_color(t.foreground).text_size(12)
      .child(h_flex().h(36).flex_none().px(12).gap(8).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().child("Git log"))
        .child(div().px(6).py(1).rounded(4).bg(t.surface).text_size(11).text_color(t.accent).truncate().max_w(140).child(this.branch || "—"))
        .child(div().flex_1())
        .child(div().id("gl-refresh").px(6).rounded(4).text_color(t.muted).hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_click((_e, cx) => this.load(cx, true)).child(this.loading ? "…" : "↻")))
      .child(div().px(12).py(6).text_size(11).text_color(t.dim).truncate().child(short(cwd)))
      .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar()
        .when(Boolean(this.error), (el) => el.child(div().p(12).text_color(t.muted).child(this.error)))
        .children(this.commits.map((c) => v_flex().id(`gl-${c.hash}`).px(12).py(6).gap(2).border_b(1).border_color(t.border)
          .hover((s) => s.bg(t.hover)).on_click(() => this.show(c))
          .child(div().truncate().text_color(t.foreground).child(c.subject))
          .child(h_flex().gap(6).text_size(11).text_color(t.dim)
            .child(div().text_color(t.accent).child(c.hash))
            .child(div().truncate().child(c.author))
            .child(div().flex_1())
            .child(div().flex_none().child(c.when)))
          .when(Boolean(c.refs), (el) => el.child(div().truncate().text_size(10).text_color(t.muted).child(c.refs))))));
  }
}
