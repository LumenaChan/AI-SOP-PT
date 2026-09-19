# Assessment Engine 智能考评与教师复核详细设计

**版本：V1.0**  
**所属产品：AI 实训智能指导与考评平台**  
**模块定位：将 SOP Runtime 输出的步骤结果、异常和证据，转换为可解释的 AI 建议成绩，并支持教师复核、修改和最终成绩确认**

---

# 一、模块定位

前面的两层已经分别解决：

**AI Event Engine：**

> 真实操作过程中发生了什么。

**SOP State Machine：**

> 这些事件在当前 SOP 中意味着什么。

例如：

```text
学生拿错工具
↓
产生 WRONG_TOOL

学生提前执行后续步骤
↓
产生 STEP_OUT_OF_ORDER

学生最终完成当前步骤
↓
Step = COMPLETED
```

Assessment Engine 接下来负责回答：

> 这些结果应该怎么评价？

因此它的输入不是摄像头，也不是原始 AI 模型结果，而应该是已经经过 SOP Runtime 处理后的标准业务结果：

```text
Step Result
+
Exception
+
Duration
+
Evidence
+
Manual Action
```

最终输出：

```text
步骤建议分
+
整场AI建议成绩
+
待复核事项
+
教师调整
+
最终成绩
+
学生报告
```

这一层必须与 AI 识别彻底解耦。

否则一旦学校修改评分标准，就会迫使算法逻辑一起修改。

---

# 二、Assessment Engine 的核心原则

## 2.1 AI 负责提供建议，不直接拥有最终裁决权

一期产品中建议明确：

> **AI建议成绩 ≠ 最终成绩。**

推荐完整链路：

```text
AI Event
↓
SOP Runtime
↓
Step Result / Exception
↓
Assessment Engine
↓
AI建议成绩
↓
教师复核
↓
最终成绩
```

特别是在正式考试场景，必须保留教师最终确认能力。

---

## 2.2 评分依据必须可解释

不能只给：

```text
总分：82
```

必须能解释：

```text
S07
标准分：5

异常：
WRONG_TOOL

规则：
错误工具 -2

本步骤建议得分：
3
```

然后继续追溯：

```text
为什么认为工具错误？
↓
对应Event
↓
对应视频
```

---

## 2.3 评分规则属于 SOP Version

不同学校、课程、比赛，可以对完全相同操作采用不同评分标准。

例如：

```text
错误工具
```

学校 A：

```text
-2
```

学校 B：

```text
-1
```

比赛规则：

```text
本步骤0分
```

因此评分不能写进 Event Engine 或状态机。

---

## 2.4 原始事实、AI评价、教师评价必须分层保存

不能因为老师把：

```text
82分
```

改成：

```text
85分
```

就把 AI 原始结果覆盖掉。

系统必须同时保留：

```text
AI原始建议
教师修改
最终结果
```

---

# 三、评分层级

建议系统支持四个层级。

```text
Step
↓
Assessment Item
↓
Dimension
↓
Session
```

具体解释如下。

---

# 四、Step：步骤级评分

最基础的评分对象是 SOP Step。

例如：

```text
S07
使用扭矩扳手紧固A点螺栓
```

标准分：

```text
5分
```

最终可能是：

```text
步骤完成
错误工具 -2
最终建议分 3
```

---

# 五、Assessment Item：评价项

一个步骤内部，不建议以后永远只看“完成/未完成”。

可以进一步拆为：

```text
流程正确性
工具选择
动作规范
操作结果
安全规范
操作效率
```

例如 S07：

```text
步骤总分：8

工具选择：2
动作规范：2
紧固结果：3
操作时长：1
```

一期 UI 可以先采用简单扣分方式。

但底层最好提前预留：

> Assessment Item。

这样后期才能做更精细的评价。

---

# 六、Dimension：能力维度

多个 Assessment Item 再映射到能力维度。

例如：

```text
工具选择
→ 工具使用能力

动作规范
→ 操作规范性

步骤顺序
→ 流程规范

操作时长
→ 操作熟练度
```

这为后续学生能力画像提供基础。

---

# 七、Session：整场成绩

最终一场考试或者训练形成：

```text
总分
+
步骤得分
+
异常
+
安全结果
+
能力维度
+
教师复核结果
```

形成：

```text
Session Assessment Result
```

---

# 八、一期建议的评分模型

一期不要一开始设计非常复杂的加权算法。

建议使用：

> **步骤标准分 - 异常扣分**

例如：

```text
S07标准分：5

WRONG_TOOL：-2
TIMEOUT：-1

最终：
5 - 2 - 1 = 2
```

最低：

```text
0分
```

即：

```text
stepScore = max(0, baseScore - deductions)
```

这种规则教师最容易理解。

---

# 九、评分规则对象

建议定义：

```text
StepScoreRule
```

至少包含：

```text
baseScore
deductionMode
minimumScore
exceptionRules
```

例如：

```json
{
  "stepId": "S07",
  "baseScore": 5,
  "deductionMode": "ACCUMULATIVE",
  "minimumScore": 0,
  "exceptionRules": [
    {
      "exceptionType": "WRONG_TOOL",
      "deduction": 2
    },
    {
      "exceptionType": "STEP_TIMEOUT",
      "deduction": 1
    },
    {
      "exceptionType": "STEP_MISSING",
      "deduction": 5
    }
  ]
}
```

---

# 十、扣分方式

一期建议至少支持两种。

### 累计扣分

例如：

```text
标准分 5

错工具 -2
超时 -1

得分 2
```

### 取最严重异常

例如：

```text
错工具 -2
漏步骤 -5

最终只取 -5
```

适用于一些学校现有评分表。

配置：

```text
deductionMode:
ACCUMULATIVE
或
MAX_ONLY
```

---

# 十一、步骤不得出现负分

默认：

```text
stepScore >= 0
```

即使：

```text
标准分5
累计扣分8
```

最终：

```text
0分
```

一期不建议支持负分。

---

# 十二、步骤未完成

如果：

```text
STEP_MISSING
```

建议默认：

> 本步骤 0 分。

而不是继续累计：

```text
错误工具
超时
漏步
```

造成重复扣分。

因此可以支持：

```text
terminalException
```

例如：

```text
STEP_MISSING
→ forceScore = 0
```

---

# 十三、终结型异常

一期建议至少支持：

```text
STEP_MISSING
CRITICAL_SAFETY_VIOLATION
```

可以配置成：

```text
FORCE_ZERO
```

甚至：

```text
TERMINATE_EXAM
```

---

# 十四、安全规则必须独立于普通评分

安全异常不能只被当成：

```text
普通 -2 分
```

建议定义三级处理。

### 一般安全异常

例如：

> PPE佩戴不规范。

处理：

```text
扣分
```

### 严重安全异常

例如：

> 在危险区域内违规操作。

处理：

```text
本步骤0分
```

### 红线安全异常

例如：

> 可能造成严重人身伤害的危险操作。

处理：

```text
整场考试不合格
```

甚至：

```text
立即终止
```

---

# 十五、安全规则配置

SOP 层建议支持：

```text
Safety Policy
```

例如：

```json
{
  "exceptionType": "SAFETY_VIOLATION",
  "severity": "CRITICAL",
  "action": "EXAM_FAIL",
  "terminateSession": true
}
```

教师端不要展示 JSON。

界面使用：

```text
严重程度：红线

处理方式：
☑ 立即终止考试
☑ 整场考试判定不合格
```

---

# 十六、“不合格”和“0分”必须区分

例如：

```text
最终得分 72
```

但发生红线：

```text
考试结果：不合格
```

所以 Session Result 最好同时保存：

```text
score
qualificationStatus
```

例如：

```text
score = 72
qualificationStatus = FAILED
```

而不是强行把：

```text
score = 0
```

这样更符合很多职业技能考试逻辑。

---

# 十七、整场评分

一期最简单：

```text
Session Score
=
所有 Step Score 合计
```

例如：

```text
S01 5
S02 10
S03 8
...
总分 100
```

SOP 发布前必须验证：

```text
sum(stepBaseScore) = sopTotalScore
```

如果不一致，不允许发布。

---

# 十八、合格线

SOP 可以配置：

```text
总分：100
合格分：60
```

正常情况下：

```text
score >= 60
→ 合格
```

但如果触发红线：

```text
score = 85
仍然：
不合格
```

所以最终规则：

```text
无红线
AND
score >= passScore
→ PASS
```

---

# 十九、步骤级评分过程

例如：

```text
S07 标准分5
```

Runtime 输出：

```text
COMPLETED

异常：
WRONG_TOOL
STEP_TIMEOUT
```

Assessment Engine：

```text
标准分            5
错误工具         -2
操作超时         -1
-------------------
AI建议分          2
```

同时生成：

```text
scoreDetails
```

用于解释。

---

# 二十、评分详情对象

例如：

```json
{
  "stepId": "S07",
  "baseScore": 5,
  "deductions": [
    {
      "exceptionType": "WRONG_TOOL",
      "score": -2,
      "evidenceId": "evidence_101"
    },
    {
      "exceptionType": "STEP_TIMEOUT",
      "score": -1,
      "evidenceId": "evidence_102"
    }
  ],
  "suggestedScore": 2
}
```

---

# 二十一、同一异常多次发生

假设学生同一步中：

```text
拿错工具
↓
纠正
↓
再次拿错
```

系统记录：

```text
WRONG_TOOL #1
WRONG_TOOL #2
```

评分到底：

```text
-2
还是 -4
```

不能由 Runtime 决定。

评分规则必须支持：

```text
applicationMode
```

---

# 二十二、异常计分方式

建议至少支持：

```text
ONCE_PER_STEP
EACH_OCCURRENCE
MAX_N_TIMES
```

例如：

### 错工具

```text
ONCE_PER_STEP
```

只扣一次。

### 安全违规

可以：

```text
EACH_OCCURRENCE
```

### 操作超时

通常：

```text
ONCE_PER_STEP
```

---

# 二十三、错误纠正以后是否恢复分数

训练场景可能存在一种教学规则：

> 第一次做错，提示后纠正，不扣分。

考试场景则：

> 即使纠正也保留扣分。

这属于评分策略，不属于 Runtime。

因此异常可记录：

```text
resolved = true
```

评分规则再决定：

```text
TRAINING：
resolved后不扣分

EXAM：
仍扣分
```

不过一期建议先简单处理：

> 训练成绩也保留错误影响。

否则同一 SOP 在不同模式下评分逻辑过于复杂。

---

# 二十四、训练成绩和考试成绩建议区分

训练场景的重点是学习，不一定必须强调 100 分制。

一期可以仍然产生：

```text
训练得分
```

但界面重点应该放在：

```text
完成情况
异常
纠错次数
操作时间
```

考试场景则重点展示：

```text
最终成绩
是否合格
```

---

# 二十五、训练模式建议额外统计

例如：

```text
提示次数
纠错次数
重试次数
教师介入次数
```

这些指标非常有教学价值。

例如两个学生都拿到 90 分：

学生 A：

```text
0次提示
```

学生 B：

```text
5次提示
```

能力水平显然不同。

---

# 二十六、训练辅助依赖度

未来可以形成：

```text
Independent Completion Rate
```

即：

> 无系统提示情况下自主完成比例。

一期可以先记录：

```text
feedbackCount
```

后续再形成指标。

---

# 二十七、操作时长评分

一期建议不要默认“越快越高分”。

因为实训中：

> 快不等于正确。

因此时长建议优先作为：

```text
超时扣分
```

而不是：

```text
速度奖励
```

例如：

```text
<= 30秒：
不扣分

30–45秒：
-1

>45秒：
-2
```

二期再考虑熟练度评分模型。

---

# 二十八、时间规则评分

可以支持：

```text
Time Score Rule
```

例如：

```text
maxTime = 30s
```

超过：

```text
STEP_TIMEOUT
```

统一交给异常评分。

不要在 Assessment Engine 单独重新计算一套时间逻辑。

---

# 二十九、AI 建议成绩生成

考试结束 Finalization 后：

```text
Step Results
+
Confirmed Exceptions
+
Review Required Items
```

进入 Assessment Engine。

如果不存在待复核：

```text
生成：
AI Suggested Score
```

如果存在：

```text
REVIEW_REQUIRED
```

建议仍然生成：

```text
暂定成绩
```

同时明确：

> 尚有 2 项待复核，最终成绩未确认。

---

# 三十、暂定成绩

例如：

```text
AI暂定成绩：86

待复核：
2项
```

这两个待复核项暂时如何计分？

建议采用：

> 暂不扣分。

教师确认异常后再应用规则。

这样避免 AI 不确定直接伤害学生成绩。

---

# 三十一、教师复核中心定位

教师复核中心不是“成绩修改页面”。

它真正解决的是：

> AI 不确定、AI 判断异常、学生争议以及系统异常情况下的人工确认。

因此页面核心不是表格，而是：

> **异常 + 视频证据 + AI判定依据 + 教师决定。**

---

# 三十二、复核任务来源

一期建议有四类。

```text
AI_UNCERTAIN
教师主动抽查
系统异常影响步骤
学生申诉/教师重新检查
```

其中一期优先做：

```text
AI_UNCERTAIN
+
教师主动复核
```

申诉流程可以二期。

---

# 三十三、复核中心首页

建议展示：

```text
待复核考试：12

待复核异常：36
今日已复核：18
```

下面按照优先级：

```text
学生
SOP
考试时间
AI建议分
待复核项
异常等级
```

例如：

```text
张三
减速器拆装
09:32
暂定 82
3项待复核
HIGH
```

---

# 三十四、单场复核页面

页面建议采用：

```text
左侧：
步骤 / 异常列表

中间：
视频

右侧：
AI判定和教师处理
```

示例：

```text
S07 工具错误

发生时间：
10:22:18

AI判断：
实际工具 = open_end_wrench

标准要求：
torque_wrench

AI置信度：
0.74

异常：
WRONG_TOOL

建议扣分：
-2
```

下方：

```text
○ AI判断正确
○ AI判断错误，操作正常
○ 异常类型错误
○ 视频无法判断
```

---

# 三十五、视频必须自动跳到异常点

教师点击异常后：

> 不应该重新拖整场视频。

系统自动播放：

```text
异常前 5 秒
+
异常过程
+
异常后 5 秒
```

例如：

```text
02:11 ～ 02:27
```

同时时间轴上突出：

```text
02:18 WRONG_TOOL
```

---

# 三十六、多机位情况下

如果以后存在：

```text
正视
顶视
特写
```

复核中心应同步播放多个机位。

但一期 PoC 可以先支持：

```text
主机位
```

如果存在第二机位则允许切换。

---

# 三十七、教师确认 AI 正确

选择：

```text
AI判断正确
```

系统：

```text
Exception
→ CONFIRMED
```

评分规则生效。

例如：

```text
-2
```

---

# 三十八、教师确认 AI 错误

选择：

```text
AI判断错误，操作正常
```

系统：

```text
Exception
→ DISMISSED
```

该异常：

> 不进入最终评分。

同时产生：

```text
AI Feedback Record
```

供后续模型优化。

---

# 三十九、教师修改异常类型

例如 AI 认为：

```text
WRONG_TOOL
```

教师认为实际上是：

```text
WRONG_OBJECT
```

选择：

> 修改异常类型。

系统应保存：

```text
originalType
newType
teacherId
reason
```

然后重新应用新的评分规则。

---

# 四十、视频无法判断

如果教师也无法从当前视频判断：

```text
视频无法确认
```

则不能强行让老师二选一。

可以：

```text
标记人工无法确认
```

最终处理方式由考试制度决定。

一期建议：

> 教师可人工指定本步骤最终结果，并填写原因。

---

# 四十一、教师直接修改步骤结果

某些情况下老师可能确认：

> AI未识别，但学生实际上完成了。

可以：

```text
S07
REVIEW_REQUIRED
↓
教师确认：
COMPLETED
```

或者：

```text
AI认为完成
↓
教师确认：
NOT_COMPLETED
```

但必须保存完整修改日志。

---

# 四十二、最终成绩不能直接手填覆盖

不建议给教师一个：

```text
总成绩：
[ 82 ]
```

然后随便改成：

```text
90
```

更合理的是：

> 修改具体评分项。

或者使用：

```text
额外调整分
```

并强制填写原因。

---

# 四十三、成绩调整机制

建议最终成绩结构：

```text
AI确认后成绩
+
教师额外调整
=
最终成绩
```

例如：

```text
AI确认成绩：82

教师调整：
+2

调整原因：
“步骤S08视频角度遮挡，经现场监考确认操作正确。”

最终：
84
```

教师调整记录必须保留。

---

# 四十四、调整分限制

一期建议：

```text
adjustmentScore
```

支持：

```text
正分 / 负分
```

但不能突破：

```text
0 ～ SOP总分
```

例如：

```text
最终 = min(totalScore, max(0, confirmedScore + adjustment))
```

---

# 四十五、教师修改权限

建议区分：

### 普通教师

可复核自己负责班级。

### 考评负责人

可修改正式考试结果。

### 管理员

可查看所有记录。

一期权限可以简单，但数据模型要能支持。

---

# 四十六、复核必须有日志

每一次处理保存：

```text
reviewer
reviewTime
originalResult
newResult
reason
evidence
```

例如：

```json
{
  "reviewer": "teacher_01",
  "original": {
    "exception": "WRONG_TOOL",
    "score": 3
  },
  "new": {
    "exception": "DISMISSED",
    "score": 5
  },
  "reason": "视频确认使用工具正确"
}
```

---

# 四十七、成绩版本

正式考试尤其建议保留：

```text
Assessment Version
```

例如：

```text
V1
AI初评

V2
教师复核

V3
负责人最终确认
```

一期不需要做复杂多级审批。

但至少保留：

```text
AI Suggestion
Teacher Reviewed
Final
```

三个层次。

---

# 四十八、最终成绩状态

建议：

```text
DRAFT
PENDING_REVIEW
REVIEWED
FINALIZED
```

含义：

### DRAFT

AI刚生成。

### PENDING_REVIEW

存在待复核项。

### REVIEWED

教师已经处理。

### FINALIZED

成绩正式确认，不再直接修改。

---

# 四十九、最终确认

教师完成所有待复核项以后：

点击：

> 确认最终成绩

系统校验：

```text
不存在待复核项
不存在未处理系统异常
总分有效
资格状态明确
```

然后：

```text
Assessment → FINALIZED
```

---

# 五十、最终成绩修改

如果已经 FINALIZED，不能直接编辑。

应走：

```text
成绩更正
```

创建新的更正记录。

例如：

```text
原最终成绩：82

更正后：84

更正原因：
监考复核

操作人：
XXX
```

保证审计链完整。

---

# 五十一、正式考试和普通训练的严格程度不同

训练结果：

> 可以允许教师比较自由地修正。

正式考试：

> 应强制保留更完整审计。

因此 Assessment Policy 可以根据任务类型区分：

```text
TRAINING
EXAM
COMPETITION
```

一期重点做：

```text
TRAINING
EXAM
```

---

# 五十二、学生看到什么

学生训练结束以后，不应该先看到：

```text
算法置信度
Event Code
模型版本
```

而应该看到：

```text
最终成绩
完成情况
错误步骤
错误原因
标准操作
自己的视频
```

例如：

```text
S07 工具选择错误

标准：
使用扭矩扳手

本次：
使用开口扳手

扣分：
-2

[查看错误视频]
[查看标准操作]
```

---

# 五十三、学生报告页面结构

建议：

## 总览

```text
成绩：86
用时：08:42
完成：11/12
异常：3
```

## 主要问题

按照影响程度排列。

## 步骤明细

每步：

```text
得分
状态
异常
用时
```

## 能力表现

一期基础雷达/条形展示。

## 视频复盘

直接进入结构化时间轴。

---

# 五十四、学生训练报告不要展示所有技术异常

例如：

```text
AI_UNCERTAIN
```

不是学生错误。

学生不应该看到：

> AI不确定扣0分。

这属于系统内部状态。

系统最终应展示教师确认后的业务结果。

---

# 五十五、能力维度评分

一期可以采用简单权重汇总。

例如：

```text
工具使用能力
```

由：

```text
S03工具选择
S07工具选择
S09工具归位
```

组成。

各步骤已经有得分。

可按权重换算：

```text
Ability Score
=
Σ 实际评价项得分
/
Σ 评价项满分
×100
```

先做简单透明的计算。

不要一期引入复杂 AI 能力画像算法。

---

# 五十六、能力映射最好落到 Assessment Item

长期来看：

```text
Step
→ Ability
```

粒度还不够细。

例如 S07：

```text
工具选择
→ 工具能力

紧固动作
→ 操作规范

完成结果
→ 装配质量
```

所以正确结构应该是：

```text
Step
↓
Assessment Item
↓
Ability
```

一期 UI 可以简化，但底层模型建议按这个方向设计。

---

# 五十七、能力维度示例

机械实训一期可内置：

```text
安全规范
流程规范
工具使用
操作规范
完成质量
操作熟练
```

这些名字要和学校专业教师一起确认。

不要由技术团队自行创造过多抽象指标。

---

# 五十八、班级统计

教师端基础统计建议一期就做。

例如：

```text
机械1班
减速器拆装实训

平均成绩：81.2
合格率：87%
平均用时：09:12
```

高频问题：

```text
S07 错误工具       38%
S10 漏复检         31%
S04 操作超时       24%
```

这比只显示成绩排名更有教学价值。

---

# 五十九、步骤错误率

计算：

```text
发生该异常的学生数
/
参与学生数
```

例如：

```text
S07 工具选择错误
12 / 30
= 40%
```

教师一眼就能发现：

> 这一知识点可能没有教好。

---

# 六十、班级步骤热力图

后期可以展示：

```text
          S01 S02 S03 S04 S05 ...
张三       ✓   ✓   ⚠   ✓   ✓
李四       ✓   ⚠   ✓   ✓   ✕
王五       ✓   ✓   ✓   ✓   ✓
```

一期如果时间有限可以不做复杂可视化。

先做：

> 步骤错误排行。

---

# 六十一、错误类型统计

跨 SOP 可以统计：

```text
WRONG_TOOL
STEP_OUT_OF_ORDER
STEP_TIMEOUT
STEP_MISSING
SAFETY_VIOLATION
```

但教师界面使用中文业务名称：

```text
工具选择错误
操作顺序错误
操作超时
步骤遗漏
安全违规
```

---

# 六十二、老师真正需要的是“哪里值得重新讲”

所以班级报告最终最好回答：

```text
哪一步错的人最多？
哪类错误最多？
哪一步耗时最长？
哪个学生需要重点辅导？
```

而不是堆很多 AI 指标。

---

# 六十三、操作时间统计

每个步骤都有：

```text
waitDuration
operationDuration
```

班级可以计算：

```text
平均操作时间
中位数
最大值
最小值
```

一期建议不要给学生做精确排名。

教师可以看：

> 哪一步整体耗时异常。

---

# 六十四、教师复核数据也是重要产品指标

平台运营层应该统计：

```text
AI异常总数
教师确认正确数
教师驳回数
待复核数
```

得到：

```text
AI异常确认率
教师修正率
```

这是比单纯实验室 Precision 更真实的线上质量指标。

---

# 六十五、AI教师修正率

例如：

```text
WRONG_TOOL
系统产生 1000 次

教师驳回 20 次
```

真实业务修正率：

```text
2%
```

如果某 Event 修正率突然上升到：

```text
15%
```

说明：

> 模型、摄像头或者环境可能有问题。

---

# 六十六、按 AI Event 反查复核质量

教师复核结果应可以回流到 AI Studio。

例如：

```text
pickup_torque_wrench
```

关联产生：

```text
错误工具判断
```

统计：

```text
确认率
驳回率
```

这样 AI 团队知道真正应该优化哪个能力。

---

# 六十七、Assessment 与 AI 优化闭环

整个闭环变成：

```text
AI Event
↓
SOP Exception
↓
Assessment
↓
Teacher Review
↓
AI Feedback
↓
Hard Sample Dataset
↓
Model Improvement
```

这会形成长期数据资产。

---

# 六十八、系统异常不得进入评分

如果 Runtime 出现：

```text
CAMERA_OFFLINE
MODEL_UNAVAILABLE
NETWORK_ERROR
```

Assessment Engine 不得自动扣学生分。

应该产生：

```text
Assessment Impact
```

例如：

```text
S07评分证据不足
→ REVIEW_REQUIRED
```

---

# 六十九、考试有效性

如果系统异常非常严重，例如：

> 40% 的考试过程没有有效视频。

这时可能不是复核一个步骤的问题，而是：

> 本次 AI 考评结果无效。

建议预留：

```text
assessmentValidity
```

例如：

```text
VALID
PARTIALLY_VALID
INVALID
```

一期可以先由教师人工决定。

---

# 七十、AI建议分的可信度

未来可以为一场考试计算：

```text
Assessment Confidence
```

例如：

```text
12个步骤

10个高置信度自动判断
1个教师确认
1个AI不确定
```

系统可以显示：

```text
AI自动评定覆盖率：83%
```

这比给出一个看起来很精确的“96.8%可信度”更容易解释。

---

# 七十一、AI 自动考评覆盖率

这是一个非常值得纳入项目 KPI 的指标。

定义：

```text
无需人工判断即可完成评分的评价项数量
/
全部评价项数量
```

例如：

```text
24 / 30
= 80%
```

第一期完全没必要追求：

```text
100%
```

只要关键步骤覆盖并且剩余部分有人机协同即可。

---

# 七十二、不要把“自动化率”当唯一目标

如果：

```text
自动化率 95%
```

但误判很多，老师天天改成绩，产品反而失败。

因此建议至少同时看：

```text
自动考评覆盖率
教师修正率
待复核率
```

理想状态是：

```text
覆盖率逐步上升
修正率逐步下降
待复核率逐步下降
```

---

# 七十三、训练模式可增加“提示依赖”

例如：

```text
张三
完成 12 步

其中：
独立完成 8
提示后完成 3
教师协助 1
```

这比单一成绩更能反映学习水平。

底层可以从：

```text
Feedback Record
+
Manual Intervention
```

统计出来。

---

# 七十四、技能掌握等级

一期不建议一开始就做：

```text
初级
熟练
精通
```

这种结论。

因为没有足够历史数据和教学标准支撑。

一期展示原始、透明指标即可：

```text
完成率
平均成绩
平均异常次数
提示次数
操作时间
```

后期再跟学校共同设计能力等级规则。

---

# 七十五、训练历史

学生应该能看到同一个 SOP 多次训练。

例如：

```text
第1次  68
第2次  79
第3次  86
第4次  91
```

并看到：

```text
错误工具：
3 → 2 → 1 → 0

操作时间：
13:20 → 11:15 → 09:42 → 08:51
```

这体现训练价值。

---

# 七十六、成绩对比必须同 SOP Version 谨慎处理

如果：

```text
V1.0总分标准
```

后来变成：

```text
V1.2评分规则
```

不能简单直接比较原始分数。

一期可以展示：

```text
SOP版本
```

后期再做跨版本标准化。

---

# 七十七、教师点评

一期建议支持：

```text
教师点评
```

但不需要做复杂 AI 自动点评。

教师在复核后可以填写：

> 操作流程基本正确，重点加强工具选择与最终复检。

学生报告展示。

---

# 七十八、未来 AI 点评的位置

以后如果引入 LLM：

不要让 LLM 自己重新判断视频。

更合理的是输入：

```text
结构化步骤结果
+
异常
+
历史训练数据
```

让 LLM 生成：

> 自然语言训练建议。

这样风险和成本都更低。

---

# 七十九、Assessment Engine 页面体系

一期建议包括：

```text
成绩总览
考试结果
教师复核中心
单场复核详情
成绩详情
学生训练报告
班级统计
```

后台增加：

```text
评分规则配置
```

但评分规则主要放在 SOP Editor 中维护。

---

# 八十、成绩总览

教师查看：

```text
任务：
减速器拆装考试

班级：
机械1班

参加：
30

已完成：
28

待复核：
4

已确认：
24
```

学生列表：

```text
姓名
AI建议成绩
待复核项
最终成绩
状态
```

---

# 八十一、成绩状态需要非常明确

例如：

```text
AI评定完成
待教师复核
已复核
已确认
系统异常
```

避免教师看到一个 82 分，就误认为已经是最终成绩。

---

# 八十二、成绩详情页

建议顶部：

```text
张三

AI建议成绩：82
教师调整：+2
最终成绩：84

结果：合格
```

下面按步骤：

```text
S01  5/5
S02  8/10
S03  10/10
...
```

点击步骤展开：

```text
异常
评分依据
操作时间
视频证据
教师处理
```

---

# 八十三、分数之外一定展示“为什么”

例如：

```text
S07
3 / 5

工具选择错误
-2

证据：
[02:18]

教师确认：
AI判断正确
```

可解释性是这个系统被老师接受的关键。

---

# 八十四、人工评分项

一些步骤一期可能完全没有 AI 能力。

例如：

```text
完成质量
```

由老师人工评分。

Assessment Engine 应支持：

```text
Manual Assessment Item
```

例如：

```text
装配成品质量
满分10

教师评分：
8
```

这样一场考试可以是：

```text
AI自动评分：80分
人工评分：20分
```

最终：

```text
100分
```

---

# 八十五、这对一期落地非常重要

不要把项目目标设成：

> 所有评分项必须 AI 自动完成。

现实落地更合理的结构往往是：

```text
AI擅长的：
步骤
顺序
工具
时间
安全
状态

教师擅长的：
细微质量
综合表现
复杂结果
```

两者组合。

---

# 八十六、AI和人工评分权重

如果学校需要，可以配置：

```text
AI评价项
+
人工评价项
```

但建议不要采用模糊的：

```text
AI占70%
教师占30%
```

更透明的是：

> 每一个具体评价项明确由谁评。

例如：

```text
步骤顺序   AI  20分
工具使用   AI  20分
安全规范   AI  20分
最终质量   教师 30分
职业素养   教师 10分
```

这样老师更容易理解。

---

# 八十七、评分主体字段

每个 Assessment Item 应标：

```text
evaluatorType
```

取值：

```text
AI
MANUAL
AI_REVIEWED
```

未来甚至可以支持：

```text
DEVICE
```

但本质最终仍进入 Assessment Engine。

---

# 八十八、Assessment Item 示例

例如：

```json
{
  "itemId": "A07_01",
  "stepId": "S07",
  "name": "工具选择正确",
  "maxScore": 2,
  "evaluatorType": "AI",
  "sourceException": "WRONG_TOOL",
  "ability": "TOOL_USAGE"
}
```

---

# 八十九、人工评价项示例

```json
{
  "itemId": "A12_03",
  "stepId": "S12",
  "name": "装配结果整体质量",
  "maxScore": 10,
  "evaluatorType": "MANUAL",
  "ability": "WORK_QUALITY"
}
```

教师考试结束后直接评分。

---

# 九十、教师复核和人工评分是两件不同的事

必须区分：

### Teacher Review

老师判断：

> AI 对不对。

### Manual Assessment

老师直接评价：

> 这个指标本来就是人工评分。

不要合并成一个“教师评分”概念。

---

# 九十一、缺少人工评分项时不能最终确认

如果一场考试存在：

```text
3个人工评分项
```

但老师只完成：

```text
2项
```

则：

```text
不能 Finalize
```

系统提示：

> 尚有 1 项人工评价未完成。

---

# 九十二、教师批量评分

一些人工项可能适合批量处理。

例如：

```text
职业素养
```

教师可以在班级表格：

```text
张三 8
李四 9
王五 7
```

一期如果时间不足可以先不做。

但大量学生时这是很现实的需求。

---

# 九十三、视频复核中心和成绩详情不要完全重复

推荐：

### 复核中心

重点：

> 待处理。

### 成绩详情

重点：

> 已经发生了什么和最终结果。

这样角色清晰。

---

# 九十四、学生申诉

一期可以不做正式申诉工作流。

但底层一定要保留：

```text
video evidence
review log
assessment history
```

未来增加申诉时无需重构。

---

# 九十五、成绩导出

一期学校基本一定会需要。

建议支持导出：

```text
学生姓名
学号
成绩
是否合格
用时
异常次数
各步骤得分
```

Excel 即可。

详细视频证据不需要导出进 Excel。

---

# 九十六、教师报告导出

后期可以支持：

```text
单学生PDF训练报告
班级成绩表
班级教学分析报告
```

一期优先：

> Excel成绩表。

---

# 九十七、评分规则发布后必须冻结

和 SOP 一样：

```text
考试已经使用的评分规则
```

不能后续直接修改。

因为否则历史成绩可能发生变化。

因此评分规则属于：

```text
SOPVersion
```

一旦发布冻结。

---

# 九十八、规则修改必须产生新版本

比如：

```text
WRONG_TOOL
-2 → -3
```

必须：

```text
V1.0
↓
创建V1.1
```

然后重新发布。

历史：

```text
V1.0考试
```

不受影响。

---

# 九十九、评分重算

如果教师修改：

```text
某个Exception状态
```

例如：

```text
CONFIRMED → DISMISSED
```

Assessment Engine 自动重新计算：

```text
Step Score
↓
Session Score
↓
Ability Score
```

不用教师手动算。

---

# 一百、评分重算必须有审计

记录：

```text
旧成绩
新成绩
触发原因
操作人
时间
```

例如：

```text
82 → 84

原因：
S07 WRONG_TOOL异常被教师驳回。
```

---

# 一百零一、不要把 AI 建议成绩永久缓存成唯一真值

真正的成绩应该能够根据：

```text
Step Result
+
Exception State
+
Manual Score
+
Score Rule
```

重新计算。

同时保存每次计算结果版本。

这样系统具备完整解释能力。

---

# 一百零二、最终核心数据对象

建议至少包括：

```text
Assessment
StepAssessment
AssessmentItem
ScoreRule
ScoreDeduction
SafetyPolicy
ManualScore
TeacherReview
ScoreAdjustment
AssessmentVersion
AssessmentAuditLog
AbilityScore
```

---

# 一百零三、Assessment 示例

```json
{
  "assessmentId": "assess_001",
  "sessionId": "session_001",

  "aiSuggestedScore": 82,
  "reviewedScore": 84,
  "finalScore": 84,

  "qualificationStatus": "PASS",

  "status": "FINALIZED",

  "reviewSummary": {
    "totalItems": 4,
    "confirmed": 3,
    "dismissed": 1
  }
}
```

---

# 一百零四、StepAssessment 示例

```json
{
  "stepId": "S07",
  "baseScore": 5,
  "suggestedScore": 3,
  "finalScore": 5,

  "exceptions": [
    {
      "type": "WRONG_TOOL",
      "aiStatus": "DETECTED",
      "reviewStatus": "DISMISSED"
    }
  ]
}
```

---

# 一百零五、平台最核心的“可信考评链”

最终每一分都应该能够反查：

```text
最终成绩84
↓
S07得到5分
↓
原AI建议3分
↓
因为AI判断WRONG_TOOL
↓
教师复核后驳回
↓
视频显示使用工具正确
↓
恢复2分
```

这才是真正适用于学校的：

> **可信 AI 考评。**

---

# 一百零六、一期 Assessment Engine 重点功能

如果严格压缩范围，一期必须做：

```text
步骤基础分
异常扣分
最低0分
安全红线
整场成绩
是否合格
AI建议成绩
待复核事项
视频复核
教师确认/驳回
人工评分项
成绩自动重算
最终成绩确认
复核日志
学生训练报告
基础班级统计
```

---

# 一百零七、一期暂缓

一期可以暂时不做：

```text
复杂评分公式
动态权重
贝叶斯能力评估
IRT能力模型
跨课程能力画像
复杂考试仲裁
学生正式申诉流程
多教师双盲评分
评分一致性分析
AI自动生成教学诊断
```

这些都不是 PoC 阶段最关键的问题。

---

# 一百零八、一期必须测试的评分 Case

至少准备：

### Case 1：标准操作

```text
100分
```

### Case 2：错工具

```text
正确完成
但扣2分
```

### Case 3：错工具后纠正

确认：

```text
步骤完成
异常保留
正常扣分
```

### Case 4：漏步骤

```text
该步骤0分
```

### Case 5：AI误判

教师驳回后：

```text
恢复分数
```

### Case 6：AI不确定

```text
不自动扣分
进入待复核
```

### Case 7：安全红线

```text
考试不合格
```

### Case 8：系统掉线

```text
不自动扣学生分
```

### Case 9：人工评分项

```text
未评分前无法确认最终成绩
```

### Case 10：教师调整成绩

```text
完整记录调整原因
```

---

# 一百零九、Assessment Engine 的验收标准

一期是否成功，至少应该满足：

第一，同样的 Runtime Result 在不同评分规则下可以产生不同成绩，而不修改 AI 和状态机代码。

第二，AI 不确定不会被自动当成错误扣分。

第三，系统异常不会成为学生异常。

第四，老师能在一分钟内理解“为什么这个步骤扣了两分”。

第五，老师驳回 AI 误判后，成绩能够自动重算。

第六，任何最终成绩都可以追溯到步骤、规则、异常和视频证据。

第七，人工评分和 AI 评分能够在同一张成绩单中组合。

第八，已确认成绩后修改必须留下审计记录。

---

# 一百一十、这一层真正解决的问题

Assessment Engine 不是单纯的：

> 自动打分。

它真正解决的是：

> **怎样把 AI 对真实操作过程的判断，转化成老师愿意信任、学生能够理解、学校能够审计的评价结果。**

所以最终不是：

```text
AI说82分
```

而应该是：

```text
为什么82分
↓
哪一步扣了
↓
为什么扣
↓
依据是什么
↓
视频在哪里
↓
老师是否确认
↓
最终成绩是多少
```

---

# 一百一十一、与前三层的最终关系

到这里，整套核心引擎已经形成完整闭环：

```text
真实世界
↓
Camera / Sensor / PLC
↓
AI Event Engine
↓
“发生了什么”
↓
SOP State Machine
↓
“在当前流程中意味着什么”
↓
Assessment Engine
↓
“应该如何评价”
↓
Teacher Review
↓
“最终怎么认定”
↓
Student Report / Teaching Analysis
```

AI Event Engine 解决感知。

SOP Engine 解决流程。

Assessment Engine 解决评价。

Teacher Review 解决可信度与最终责任。

这四层组合起来，才是真正完整的职业教育 AI-SOP 产品闭环。

---

# 一百一十二、一句话定义 Assessment Engine

> **Assessment Engine 的本质，是把机器判定转化为一套可解释、可复核、可调整、可追溯的教学评价体系，而不是简单把 AI 输出换算成一个分数。**

如果这一层做得足够透明，即使一期 AI 自动化覆盖率只有 70%～80%，系统仍然有机会真正进入学校使用。

反过来，即使 AI 自动化率达到 95%，但老师不知道为什么扣分、不能复核、无法修改，产品仍然很难进入正式教学和考试场景。
