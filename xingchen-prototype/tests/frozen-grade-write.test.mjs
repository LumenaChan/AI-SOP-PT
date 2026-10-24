import test from "node:test";
import assert from "node:assert/strict";
import { assertFrozenGradeWrite } from "../src/frozenGradeWriteRules.js";
const fixture = () => ({
  arrangements: [
    {
      id: "a",
      status: "已发布",
      sessions: [
        {
          id: "s",
          score: 85,
          scoreVersion: 2,
          resultStatus: "已发布",
          steps: [
            {
              id: "step",
              score: 85,
              effectiveScore: 85,
              rawScore: 80,
              maxScore: 100,
            },
          ],
        },
      ],
    },
  ],
});
for (const mutation of [
  "score",
  "raw",
  "step",
  "review",
  "remove",
  "unpublish",
])
  test(`B12 共享冻结守卫拒绝旧路径 ${mutation}`, () => {
    const before = fixture(),
      next = structuredClone(before),
      a = next.arrangements[0],
      s = a.sessions[0];
    if (mutation === "score") s.score = 100;
    if (mutation === "raw") s.steps[0].rawScore = 100;
    if (mutation === "step") s.steps[0].effectiveScore = 100;
    if (mutation === "review") s.reviewHistory = [{ reason: "旧弹窗覆盖" }];
    if (mutation === "remove") a.sessions = [];
    if (mutation === "unpublish") a.status = "待发布";
    assert.throws(() => assertFrozenGradeWrite(before, next), /已发布成绩/);
  });
test("B12 单独session冻结也不能普通改分，允许复位和录像元数据更新", () => {
  const before = fixture();
  before.arrangements[0].status = "已结束";
  const s = before.arrangements[0].sessions[0];
  s.resultStatus = "正式成绩";
  s.scoreFrozen = true;
  const next = structuredClone(before);
  next.arrangements[0].sessions[0].status = "已复位";
  next.arrangements[0].sessions[0].recording = { fullVideoAvailable: false };
  assert.equal(assertFrozenGradeWrite(before, next), next);
  next.arrangements[0].sessions[0].scoreFrozen = false;
  assert.throws(() => assertFrozenGradeWrite(before, next), /已发布成绩/);
});
