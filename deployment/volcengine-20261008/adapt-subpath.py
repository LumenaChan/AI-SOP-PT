from pathlib import Path
import sys
root = Path(sys.argv[1])
app = root / 'src/App.jsx'
s = app.read_text()
replacements = {
    '<BrowserRouter>': '<BrowserRouter basename={import.meta.env.BASE_URL.replace(/\\/$/, "") || "/"}>',
    'href={`/data-screen?scope=': 'href={`${import.meta.env.BASE_URL}data-screen?scope=',
    'href="/data-screen?scope=school"': 'href={`${import.meta.env.BASE_URL}data-screen?scope=school`}',
}
for old, new in replacements.items():
    if s.count(old) != 1:
        raise SystemExit('源代码结构已变化，请检查子路径适配：' + old)
    s = s.replace(old, new)
app.write_text(s)
for p in (root / 'src').rglob('*'):
    if p.suffix in {'.jsx', '.js', '.css', '.json'}:
        s = p.read_text()
        if '/assets/' in s:
            p.write_text(s.replace('/assets/', '/xingchen/assets/'))
print('已适配 /xingchen/ 路由、图片和数据大屏入口；仅修改临时构建副本。')
