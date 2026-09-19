# SOP State Machine 与实时判定引擎详细设计

**版本：V1.0**  
**所属产品：AI 实训智能指导与考评平台**  
**模块定位：将 AI Event 转换为 SOP 步骤状态、异常和考评结果的核心运行引擎**

---

# 一、模块定位

AI Event Engine 解决的是：

> 真实世界发生了什么。

例如：

```text
学生拿起了扭矩扳手。
学生将扭矩扳手带入装配区域。
学生执行了紧固动作。
学生拿起了普通开口扳手。
```

但这些事件本身并不能判断学生操作是否正确。

真正的业务判断需要结合当前 SOP：

```text
现在应该执行哪一步？
这一步的前置步骤是否已经完成？
学生拿的这个工具是不是当前步骤要求的？
学生是不是提前执行了后面的操作？
当前事件是否足以判定步骤完成？
学生做错以后重新做对，系统应该怎么处理？
```

这些都属于：

> **SOP State Machine（SOP 状态机）与实时判定引擎**

因此整套链路为：

```text
AI Event Engine
↓
标准 Event
↓
SOP Runtime Engine
↓
Step State Machine
↓
异常判定
↓
训练反馈 / 考试记录
↓
Assessment Engine
```

这一层应该完全独立于 YOLO、Pose、PLC、传感器等底层实现。

它只消费标准事件。

---

# 二、核心设计原则

SOP Runtime Engine 建议坚持以下原则。

第一，**事件是事实，状态机负责解释事实。**

例如：

```text
pickup_open_end_wrench
```

只是事实。

是否属于：

```text
WRONG_TOOL
```

必须由当前步骤规则判断。

第二，**步骤状态必须显式存在。**

系统不能只知道：

```text
S03 完成 / 未完成
```

还应该知道：

```text
等待
可执行
正在执行
已完成
异常
超时
待复核
```

第三，**历史状态不能被覆盖。**

学生可能：

```text
第一次做错
↓
重新操作
↓
第二次做对
```

最终步骤可以变成完成，但第一次错误仍然必须保留。

第四，**训练模式和考试模式共享判定逻辑，但反馈策略不同。**

不能做两套不同的 SOP Engine。

第五，**AI 不确定必须是合法状态。**

系统不能为了自动化率强行二选一。

---

# 三、运行时核心对象

建议一场实训启动以后创建：

```text
SOPRuntimeSession
```

代表：

> 某个学生在某个工位，基于某个 SOP Version 进行的一次完整训练或考试。

核心信息包括：

```text
sessionId
studentId
stationId
sopId
sopVersionId
mode
startTime
endTime
runtimeStatus
currentStep
```

例如：

```json
{
  "sessionId": "session_20261001_00081",
  "studentId": "student_001",
  "stationId": "station_03",
  "sopVersion": "sop_001_v1.2",
  "mode": "TRAINING",
  "status": "RUNNING",
  "currentStep": "S04"
}
```

---

# 四、Session 状态

一场完整实训建议包含：

```text
CREATED
已创建

READY
设备和环境准备完成

RUNNING
正在执行

PAUSED
暂停

COMPLETED
正常完成

TERMINATED
提前终止

CANCELLED
任务取消

REVIEW_REQUIRED
需要教师复核
```

不要只使用：

```text
进行中 / 已完成
```

因为以后考试过程中可能出现：

> 摄像头掉线、教师暂停、安全红线终止、AI大面积异常。

---

# 五、Step 状态模型

一个 SOP Step 建议至少具有以下状态：

```text
WAITING
READY
IN_PROGRESS
COMPLETED
FAILED
SKIPPED
TIMEOUT
REVIEW_REQUIRED
```

各状态含义如下。

### WAITING

当前步骤的前置条件尚未满足。

学生原则上不应该执行。

---

### READY

所有前置条件已满足。

当前允许执行。

---

### IN_PROGRESS

已经观察到与该步骤有关的操作，但完成条件尚未全部满足。

---

### COMPLETED

步骤已经满足完成条件。

---

### FAILED

步骤已经确定失败。

一期建议主要用于：

> 不允许继续恢复的严重错误。

普通错误不要立即 FAILED。

---

### SKIPPED

步骤被允许跳过。

或者教师人工确认跳过。

---

### TIMEOUT

超过步骤允许的最大操作时间。

---

### REVIEW_REQUIRED

AI无法做出可靠判断，需要人工复核。

---

# 六、状态迁移基本模型

典型步骤状态：

```text
WAITING
  ↓
READY
  ↓
IN_PROGRESS
  ↓
COMPLETED
```

异常情况下：

```text
READY
↓
IN_PROGRESS
↓
TIMEOUT
```

或者：

```text
READY
↓
REVIEW_REQUIRED
```

但实际业务不能把状态迁移设计得过于死板。

例如一个简单步骤：

> 戴上护目镜。

可能直接：

```text
READY
↓
COMPLETED
```

不需要经历 IN_PROGRESS。

所以状态机应该允许不同 Step Type 定义不同迁移路径。

---

# 七、步骤完成不是一个 Event，而是一个 Condition

这一点非常重要。

例如：

> 使用扭矩扳手紧固 A 点螺栓。

完成条件不是：

```text
收到 tighten 事件
```

而可能是：

```text
person_holding_tool(torque_wrench)
AND
tightening(target=bolt_A)
AND
duration >= 2s
```

因此系统内部应该有：

```text
StepCompletionCondition
```

而不是：

```text
StepCompletionEvent
```

Event 是输入。

Condition 是判断逻辑。

---

# 八、Condition Runtime

每个 Step 启动后，需要维护自己的条件运行状态。

例如：

```text
S07 条件：

C1 使用扭矩扳手
C2 对A点螺栓进行紧固
C3 紧固持续2秒以上
```

运行过程中：

```text
C1 ✓
C2 ✓
C3 1.2 / 2.0s
```

状态：

```text
IN_PROGRESS
```

当：

```text
C3 = 2.0s
```

则：

```text
S07 → COMPLETED
```

---

# 九、条件状态

Recognition Condition 建议维护：

```text
UNMET
PARTIAL
MET
UNCERTAIN
INVALID
```

例如：

```text
工具条件：MET
动作条件：MET
目标条件：UNCERTAIN
```

如果步骤规则是 AND：

```text
不能完成
```

可以进入：

```text
REVIEW_REQUIRED
```

或者继续等待更多证据。

---

# 十、条件逻辑

一期建议支持：

```text
ALL
ANY
```

分别对应：

```text
AND
OR
```

例如：

```text
完成本步骤需要满足全部条件
```

底层：

```text
C1 AND C2 AND C3
```

未来二期再支持：

```text
GROUP
NOT
SEQUENCE
N_OF_M
```

但底层数据结构应避免完全写死。

---

# 十一、步骤激活机制

系统不能对所有步骤同时进行完整判定。

否则：

> 后面某个动作偶然出现，

很容易误判为提前执行。

建议每个 Runtime Session 中步骤分为：

```text
ACTIVE
OBSERVABLE
INACTIVE
```

例如当前：

```text
S03 READY
```

系统重点判定：

```text
S03
```

同时可以监测：

```text
S04、S05
```

用于发现提前执行。

但不需要完整运行所有后续步骤。

这可以减少计算和误判。

---

# 十二、当前步骤的概念

一期线性 SOP 中可以存在：

```text
currentStepId
```

例如：

```text
currentStep = S04
```

但底层架构不应该假设永远只有一个当前 Step。

未来可能出现：

```text
两个步骤可以并行执行。
```

因此建议内部维护：

```text
activeSteps:[]
```

一期通常只有一个元素。

---

# 十三、前置依赖判断

每个 Step 进入 READY 的条件由：

```text
StepDependency
```

决定。

例如：

```text
S04 depends_on S03 COMPLETED
```

当：

```text
S03 → COMPLETED
```

系统自动重新计算：

```text
S04
```

如果所有前置满足：

```text
WAITING → READY
```

---

# 十四、多个前置步骤

例如：

```text
S05
```

要求：

```text
S03完成
AND
S04完成
```

则：

```text
dependencies:
S03 COMPLETED
S04 COMPLETED
```

全部满足后才 READY。

未来条件分支时，也可以扩展为：

```text
ANY
ALL
```

---

# 十五、当前步骤自动推进

当：

```text
S04 COMPLETED
```

系统重新计算依赖。

如果：

```text
S05 READY
```

训练模式前端：

> 自动切换至 S05。

考试模式：

> 后台更新，但不告诉学生。

这是同一运行时状态，不同展示策略。

---

# 十六、正常执行案例

假设：

```text
S01 PPE
S02 检查工具
S03 取扭矩扳手
S04 紧固螺栓
```

运行过程：

```text
S01 READY
↓
PPE检测完成
↓
S01 COMPLETED

S02 WAITING → READY
↓
工具检查事件满足
↓
S02 COMPLETED

S03 WAITING → READY
↓
pickup_torque_wrench
↓
S03 COMPLETED

S04 WAITING → READY
```

完整事件日志应被保存。

---

# 十七、步骤开始时间

什么时候认为 Step 开始？

不能简单用：

> 上一步结束时间。

建议定义：

```text
readyAt
```

和：

```text
startedAt
```

分开。

例如：

```text
S04 READY at 10:00:00
```

学生 8 秒后才开始：

```text
S04 IN_PROGRESS at 10:00:08
```

则：

```text
ready waiting = 8s
```

和：

```text
actual operation duration
```

是两种不同指标。

以后可用于熟练度分析。

---

# 十八、步骤开始条件

默认：

> 第一个与该步骤有关的有效事件出现时进入 IN_PROGRESS。

例如步骤需要：

```text
torque_wrench
tightening
```

收到：

```text
person_holding_tool(torque_wrench)
```

即可：

```text
READY → IN_PROGRESS
```

---

# 十九、步骤时长应拆成两类

建议记录：

### Wait Duration

步骤 READY 后多久开始。

反映：

> 学生是否迟疑。

### Operation Duration

开始操作后多久完成。

反映：

> 实际操作速度。

例如：

```text
readyAt: 10:00:00
startedAt: 10:00:08
completedAt: 10:00:15
```

则：

```text
等待时间：8秒
操作时间：7秒
```

这对以后评价熟练度很有价值。

---

# 二十、步骤超时

SOP Editor 可以定义：

```text
maxOperationTime = 30s
```

这里一定要明确：

> 是 READY 后 30 秒，还是开始操作以后 30 秒。

一期建议分别支持：

```text
maxWaitTime
maxOperationTime
```

默认只启用：

```text
maxOperationTime
```

避免老师混淆。

---

# 二十一、TIMEOUT 之后是否还能恢复

不同 SOP 应允许不同策略。

例如：

```text
超时后允许继续完成
```

则：

```text
TIMEOUT
↓
继续操作
↓
COMPLETED_WITH_EXCEPTION
```

但我们前面的 Step 状态没有这个状态。

因此建议：

> Step 最终业务状态与 Exception 分开。

也就是说步骤最终仍然可以：

```text
COMPLETED
```

同时存在：

```text
TIMEOUT_EXCEPTION
```

这比大量创建：

```text
COMPLETED_WITH_TIMEOUT
COMPLETED_WITH_WRONG_TOOL
```

更干净。

---

# 二十二、Step 状态和异常必须分离

这是非常关键的模型设计。

例如：

```text
S07 = COMPLETED
```

同时可能存在：

```text
WRONG_TOOL
TIMEOUT
```

因为学生：

> 一开始拿错工具，后来换对工具并最终完成。

所以不要把：

```text
异常
```

全部塞进 Step State。

建议：

```text
StepRuntimeState
+
StepException[]
```

分开保存。

---

# 二十三、Exception 数据模型

例如：

```json
{
  "exceptionId": "ex_0001",
  "sessionId": "session_01",
  "stepId": "S07",
  "type": "WRONG_TOOL",
  "occurredAt": "2026-10-01T10:22:11",
  "status": "RECORDED",
  "severity": "NORMAL",
  "evidenceEventIds": [
    "evt_1001"
  ]
}
```

---

# 二十四、统一异常类型

一期建议继续采用：

```text
STEP_MISSING
STEP_OUT_OF_ORDER
WRONG_TOOL
WRONG_OBJECT
WRONG_REGION
STEP_TIMEOUT
DUPLICATE_OPERATION
SAFETY_VIOLATION
AI_UNCERTAIN
MANUAL_EXCEPTION
```

另外建议新增：

```text
INVALID_OPERATION
```

用于：

> 发生了 SOP 中没有定义，但明确属于无效操作的行为。

---

# 二十五、错误工具判断

例如当前：

```text
S07 READY
```

要求：

```text
tool = torque_wrench
```

Event Engine 收到：

```text
pickup_open_end_wrench
```

SOP Engine需要判断：

1. 这个事件是否和当前步骤相关？

2. 是否属于工具类事件？

3. 当前步骤允许工具集合是什么？

若：

```text
actual = open_end_wrench
allowed = torque_wrench
```

则产生：

```text
WRONG_TOOL
```

但 S07 不一定 FAILED。

训练模式可以：

> 提示重新选择工具。

学生重新拿对：

```text
继续完成。
```

---

# 二十六、错误工具后恢复

推荐行为：

```text
S07 READY
↓
拿错工具
↓
产生 WRONG_TOOL
↓
S07 保持 READY / IN_PROGRESS
↓
学生放回错误工具
↓
拿起正确工具
↓
继续执行
↓
S07 COMPLETED
```

最终记录：

```text
步骤完成
异常1次
扣2分
```

而不是：

> 一旦拿错，整个步骤永久失败。

---

# 二十七、训练模式的“纠错成功”

训练模式应该记录：

```text
exceptionResolved
```

例如：

```text
错误工具
↓
系统提醒
↓
学生重新选择
↓
操作正确
```

形成：

```text
WRONG_TOOL
status = RESOLVED
```

这可以产生非常有价值的教学数据：

> 学生在提示后能否独立纠正。

---

# 二十八、异常状态

Exception 建议包含：

```text
DETECTED
RESOLVED
CONFIRMED
DISMISSED
REVIEW_REQUIRED
```

含义：

```text
DETECTED
系统检测到

RESOLVED
学生在训练过程中已经纠正

CONFIRMED
最终确定为有效异常

DISMISSED
教师确认AI误判

REVIEW_REQUIRED
等待人工确认
```

---

# 二十九、异常不能因为“已纠正”就删除

例如：

```text
错误工具 → 后来纠正
```

训练报告仍然应该告诉学生：

> 本次发生过一次工具选择错误。

因此：

```text
RESOLVED
```

只代表：

> 当前操作已经恢复正常。

并不代表异常记录消失。

---

# 三十、错序判断

假设：

```text
S03 READY
S04 WAITING
```

学生提前发生：

```text
S04对应关键事件
```

状态机应产生：

```text
STEP_OUT_OF_ORDER
step = S04
expectedStep = S03
```

但这里不能过于简单。

因为某个 Event 可能同时属于多个步骤。

所以必须基于：

```text
Event → Candidate Steps
```

进行匹配。

---

# 三十一、Candidate Step Matching

收到一个 Event 后，Runtime Engine 先判断：

```text
这个事件可能与哪些步骤有关？
```

例如：

```text
pickup_torque_wrench
```

可能同时属于：

```text
S03 取扭矩扳手
S08 再次取扭矩扳手
```

系统需要结合：

```text
当前状态
前置步骤
时间位置
已完成步骤
```

选择最合理 Candidate。

不能简单绑定：

```text
pickup_torque_wrench = S03
```

---

# 三十二、事件与步骤是多对多关系

这是另一个重要架构原则。

一个 Event 可以：

> 参与多个 Step。

一个 Step 也可以：

> 需要多个 Event。

因此关系应为：

```text
Event
↔
StepRecognitionCondition
```

而不是 Event 上直接保存：

```text
stepId
```

---

# 三十三、提前操作策略

SOP Editor 可为步骤配置：

```text
allowEarlyExecution
```

一期默认：

```text
false
```

如果：

```text
S04提前发生
```

产生：

```text
STEP_OUT_OF_ORDER
```

但是否保留这次操作结果，需要另一个规则。

---

# 三十四、提前做了后，后面还算不算完成

例如标准：

```text
S03
然后 S04
```

学生先做了 S04，再做 S03。

之后到了 S04。

系统有三种可能策略：

### 策略 A：必须重新执行

最严格。

此前 S04 不算。

---

### 策略 B：保留执行结果，但记录错序

适合某些最终结果仍然有效的项目。

---

### 策略 C：教师决定

考试结束进入复核。

一期建议 SOP Editor 提供：

```text
错序后是否要求重新执行
```

默认：

> 要求重新执行。

---

# 三十五、步骤遗漏判断

“漏步”不能在学生刚没做时马上判定。

因为系统不知道：

> 他只是暂时没做，还是最终不做。

一般在两种情况下确认：

### 情况一

学生已经完成后续关键步骤，使得当前步骤不可能再正常执行。

### 情况二

Session 结束。

因此：

```text
STEP_MISSING
```

最好分为：

```text
POTENTIAL_MISSING
CONFIRMED_MISSING
```

---

# 三十六、潜在漏步

例如：

```text
S03 READY
```

学生直接开始 S04。

系统可以先记录：

```text
S03 potential missing
S04 out of order
```

如果之后学生返回完成 S03：

```text
S03 不再 missing
```

但 S04 的错序异常仍保留。

---

# 三十七、Session 结束时最终补漏

训练/考试结束时：

遍历所有：

```text
required = true
```

且：

```text
state != COMPLETED
```

的步骤。

如果没有合法跳过：

生成：

```text
STEP_MISSING
```

这是最稳定的一次最终校验。

---

# 三十八、重复操作

学生可能：

```text
完成 S03
↓
再次执行 S03
```

系统需要判断：

> 允许还是异常。

SOP Step 配置：

```text
allowRepeat
```

默认：

```text
false
```

如果不允许：

```text
DUPLICATE_OPERATION
```

但是否扣分由 Score Rule 决定。

---

# 三十九、重复动作不等于重复步骤

例如：

> 拧螺栓需要旋转很多次。

Event Engine 可能出现多个：

```text
rotation
```

这不是：

> 重复执行步骤。

所以 DUPLICATE_OPERATION 应基于：

> 已经完成的 Step 又被完整触发，

而不是基础动作重复。

---

# 四十、错误对象

例如要求：

```text
安装 part_A
```

实际：

```text
拿了 part_B
```

产生：

```text
WRONG_OBJECT
```

和错误工具逻辑类似。

未来这个异常在装配、接线、零件识别里会非常常见。

---

# 四十一、错误区域

例如：

> 零件应该放到装配区 A。

实际：

```text
object_enter_region(B)
```

产生：

```text
WRONG_REGION
```

区域事件通常准确率较高，非常适合一期使用。

---

# 四十二、安全异常

安全事件优先级要高于普通 SOP 判断。

例如：

```text
HAND_ENTER_DANGER_ZONE
```

即使当前 Step 并未要求判断危险区域，也可以由：

```text
Global Safety Rule
```

捕获。

所以系统应该存在两类规则：

```text
Step Rule
Global Runtime Rule
```

---

# 四十三、全局规则

全局规则作用于整个 Session。

例如：

```text
未佩戴护目镜禁止开始
手进入危险区域
摄像头掉线
未识别到学生身份
```

不属于某一个具体 Step。

但仍可关联：

```text
当前步骤
```

作为上下文。

---

# 四十四、安全红线终止

如果规则配置：

```text
severity = CRITICAL
terminateSession = true
```

则：

```text
SAFETY_VIOLATION
↓
Session → TERMINATED
```

训练模式可以：

> 立即停止并警告。

考试模式：

> 立即终止考试并记录。

如果未来接设备控制，还可以触发：

```text
DEVICE_STOP_REQUEST
```

但一期不必真正执行硬件停机。

---

# 四十五、AI_UNCERTAIN

Event Engine 可能输出：

```text
UNCERTAIN
```

SOP Engine 不应该直接判：

> 错误。

建议根据 Step 配置采取：

### 训练模式

提示：

> 当前操作未能可靠识别，请重新执行。

或者允许教师现场确认。

### 考试模式

继续记录，进入：

```text
REVIEW_REQUIRED
```

不直接扣分。

---

# 四十六、REVIEW_REQUIRED 不能阻塞整个考试

如果一个步骤 AI 不确定，考试不能停在那里。

例如：

```text
S05 REVIEW_REQUIRED
```

但学生继续执行：

```text
S06
```

为了考试能够继续，需要引入：

> **运行状态**

和：

> **最终判定状态**

分离。

---

# 四十七、Provisional Result

建议 Step 额外维护：

```text
provisionalStatus
```

例如：

```text
S05
runtimeState = PASSED_FORWARD
reviewStatus = REVIEW_REQUIRED
```

也就是：

> 为了流程继续，系统暂时视作可继续。

但最终成绩待教师确认。

一期产品界面不一定展示这个技术名词，但底层需要类似机制。

---

# 四十八、人工确认步骤

如果某一步配置：

```text
completionMode = MANUAL
```

状态：

```text
READY
```

教师/学生执行人工确认：

```text
MANUAL_EVENT
```

后：

```text
COMPLETED
```

人工确认本身同样属于标准 Event。

这样状态机不需要特殊写一堆代码。

---

# 四十九、AI + 人工确认

配置：

```text
completionMode = AI_PLUS_MANUAL
```

流程：

```text
AI条件满足
↓
IN_PROGRESS / WAIT_CONFIRM
↓
教师确认
↓
COMPLETED
```

建议内部增加：

```text
WAITING_CONFIRMATION
```

如果不想扩大 Step 主状态，也可以作为 Condition。

但从实现清晰度看，我建议 Step State 增加：

```text
WAITING_CONFIRMATION
```

因此最终 Step Runtime State 建议调整为：

```text
WAITING
READY
IN_PROGRESS
WAITING_CONFIRMATION
COMPLETED
FAILED
SKIPPED
TIMEOUT
REVIEW_REQUIRED
```

---

# 五十、暂停 Session

教师可能点击：

> 暂停实训。

Session：

```text
RUNNING → PAUSED
```

暂停期间：

```text
Step计时暂停
Event可以继续记录原始数据
但不参与SOP判定
```

恢复：

```text
PAUSED → RUNNING
```

否则学生上厕所回来发现：

> 所有步骤全部超时。

---

# 五十一、暂停期间视频如何处理

建议视频仍然连续保存。

时间轴标记：

```text
PAUSED
10:12:02–10:15:42
```

但：

```text
effectiveRuntimeDuration
```

不计算暂停时间。

---

# 五十二、设备掉线

如果摄像头掉线：

```text
Camera Offline
```

不应该继续产生：

> 学生漏做步骤。

应产生：

```text
SYSTEM_EXCEPTION
```

并暂停相关 AI 判定。

建议一期增加系统异常类型：

```text
CAMERA_OFFLINE
AI_ENGINE_OFFLINE
MODEL_UNAVAILABLE
NETWORK_ERROR
```

这些不能算学生错误。

---

# 五十三、业务异常和系统异常必须分开

### Student Exception

```text
WRONG_TOOL
STEP_MISSING
```

影响：

> 成绩。

### System Exception

```text
CAMERA_OFFLINE
AI_SERVICE_ERROR
```

原则上：

> 不影响学生成绩。

这一点非常重要。

否则 AI 系统自己坏了，却给学生扣分。

---

# 五十四、系统异常后的恢复

例如摄像头掉线 20 秒。

恢复后：

```text
继续 Session
```

但这 20 秒对应步骤可能已经无法可靠判断。

建议：

```text
相关 Step → REVIEW_REQUIRED
```

而不是自动判错。

---

# 五十五、训练模式反馈策略

Runtime Engine 输出的判定结果，不直接决定 UI 如何提示。

应该有：

```text
Feedback Policy
```

例如：

```text
WRONG_TOOL

TRAINING：
立即提示

EXAM：
静默记录
```

这样 SOP 判定和 UI 策略解耦。

---

# 五十六、训练模式异常提示

建议异常产生后输出：

```text
FeedbackCommand
```

例如：

```json
{
  "type": "WARNING",
  "code": "WRONG_TOOL",
  "message": "当前工具不符合要求，请重新选择。",
  "stepId": "S07"
}
```

前端决定：

```text
弹窗
红框
语音
顶部提示
```

---

# 五十七、训练模式是否直接告诉正确答案

建议每种异常支持：

```text
feedbackLevel
```

例如：

### Level 1

只告诉：

> 当前操作不正确。

### Level 2

告诉：

> 工具选择错误。

### Level 3

直接告诉：

> 请使用扭矩扳手。

未来老师可以根据训练难度选择。

一期可先固定为：

> Level 2 或 Level 3。

---

# 五十八、考试模式

考试模式 Runtime Engine 仍然完整运行：

```text
步骤状态
异常
时间
证据
```

区别只是：

```text
feedbackPolicy = SILENT
```

学生端不看到：

```text
是否正确
扣多少分
下一步是什么
```

教师实时监控端也可以根据考试规则决定是否显示异常。

---

# 五十九、考试过程中是否允许自动纠正

考试模式下学生自己发现错误后重新做对：

系统应该：

> 记录第一次错误，也记录最终正确完成。

例如：

```text
10:02 拿错工具
10:04 放回
10:05 拿正确工具
10:08 完成步骤
```

最终：

```text
S07 COMPLETED
WRONG_TOOL = CONFIRMED
```

评分按规则扣分。

这是非常自然的考试逻辑。

---

# 六十、步骤回退

学生可能发现：

> 前面一步做错了。

主动返回前一步重新操作。

一期建议不要做复杂的 UI “返回步骤”。

但 Runtime Engine 应允许观察：

```text
已完成步骤对应事件再次出现。
```

再根据：

```text
allowRepeat
```

判断。

如果某些实训确实允许返工，可以在二期增加：

```text
allowRework
```

---

# 六十一、Rework 概念建议预留

未来生产和实训中很常见：

```text
S05完成
↓
发现结果不正确
↓
重新执行S05
```

与 Duplicate 不完全一样。

所以底层建议预留：

```text
reworkCount
```

一期可以不开放配置。

---

# 六十二、多次尝试

训练模式尤其需要记录：

```text
attemptCount
```

例如：

```text
S07

尝试次数：3

第1次：
错误工具

第2次：
动作未完成

第3次：
完成
```

这比最终：

> S07 = 完成

更有教学价值。

---

# 六十三、Attempt 数据对象

建议：

```text
StepAttempt
```

包含：

```text
attemptId
stepId
startAt
endAt
result
exceptionIds
eventIds
```

训练模式可以自然形成：

> 学生经过几次尝试才完成。

---

# 六十四、什么时候产生新 Attempt

一期可以采用简单规则：

当 Step 为 READY：

> 第一次相关 Event 触发 Attempt #1。

如果产生异常后学生明确“重置”操作，例如：

```text
错误工具放回
```

然后重新开始：

> Attempt #2。

具体算法可以逐步优化。

---

# 六十五、步骤重置

训练模式教师可能需要：

> 重做当前步骤。

建议支持：

```text
Reset Step
```

这不是删除历史记录。

而是：

```text
结束当前 Attempt
↓
新增 Attempt
↓
Step 回到 READY
```

此前异常和视频全部保留。

---

# 六十六、整场重新开始

如果学生要重新练习：

不要 Reset 当前 Session。

而是：

```text
结束 Session A
↓
创建 Session B
```

这样历史训练次数才准确。

---

# 六十七、跳过步骤

如果 Step：

```text
required = false
```

系统可允许：

```text
SKIPPED
```

如果：

```text
required = true
```

只有教师有权限人工跳过，并记录：

```text
operator
reason
timestamp
```

---

# 六十八、教师人工干预

一期教师端建议允许：

```text
确认当前步骤完成
标记步骤未完成
跳过步骤
重置步骤
暂停实训
终止实训
```

每一次都必须记录 Audit Log。

AI 系统不能阻止老师拥有最终教学控制权。

---

# 六十九、人工修改不能篡改 AI 原始判断

例如：

AI：

```text
S07 REVIEW_REQUIRED
```

教师：

```text
确认已完成
```

应该保存：

```text
AI original result
+
Teacher final decision
```

而不是把原始结果改成：

```text
AI COMPLETED
```

这样以后才能分析 AI 质量。

---

# 七十、Session Event Log

整个 Runtime Engine 最终应该生成一条完整日志。

例如：

```text
10:01:02 Session started
10:01:04 S01 READY
10:01:09 PPE detected
10:01:10 S01 COMPLETED

10:01:10 S02 READY
10:01:21 Tool check started
10:01:30 S02 COMPLETED

10:01:30 S03 READY
10:01:36 Wrong tool detected
10:01:36 WRONG_TOOL
10:01:43 Correct tool picked
10:01:45 S03 COMPLETED
```

这就是系统真正的数字化实训记录。

---

# 七十一、日志类型

建议 Runtime Log 至少区分：

```text
SESSION_EVENT
STEP_STATE_CHANGE
AI_EVENT
EXCEPTION
FEEDBACK
MANUAL_ACTION
SYSTEM_EVENT
```

前端时间轴可以选择性展示。

---

# 七十二、实时状态存储

状态机运行时数据需要快速读写。

建议概念上区分：

### Runtime State

当前状态。

例如：

```text
S07 IN_PROGRESS
```

### Immutable Event Log

历史发生过的事实。

例如：

```text
10:22 WRONG_TOOL
```

Runtime State 可以更新。

Event Log 原则上只追加，不修改。

---

# 七十三、为什么要采用 Event Sourcing 思路

不一定需要严格使用 Event Sourcing 技术架构。

但设计思想很适合这个产品。

因为未来出现争议：

> 为什么系统给学生扣了2分？

可以根据日志回放：

```text
什么 Event 到达
↓
当时哪个 Step READY
↓
触发了哪个 Rule
↓
产生什么 Exception
↓
应用哪个评分规则
```

整个结果可解释。

---

# 七十四、规则判定结果也需要版本

每个 Runtime Session 应锁定：

```text
SOPVersion
RuleVersion
EventCapabilityVersion
```

否则三个月以后模型和规则全部升级，再回看历史成绩时无法解释。

---

# 七十五、实时判定延迟

整个链路延迟为：

```text
摄像头采集
+
AI推理
+
Event确认
+
SOP规则判断
+
前端反馈
```

训练模式中这是核心体验指标。

建议后续统计：

```text
End-to-End Feedback Latency
```

例如：

```text
拿错工具
↓
学生看到提示
```

目标一期 PoC 可以先要求：

> 常规异常尽量控制在 1～2 秒级。

安全事件要求更低延迟。

---

# 七十六、不要为了低延迟牺牲稳定性

例如拿工具：

如果刚碰到工具就提示：

> 工具错误。

学生只是整理工具，也会被疯狂警告。

因此需要平衡：

```text
Detection Delay
vs
False Positive
```

这就是 Event Engine 中 Candidate → Confirmed 机制的重要性。

---

# 七十七、状态机 Debugger

技术后台建议提供：

> Runtime Debugger。

选择一场 Session 后，可以看到：

```text
左侧：视频
中间：Event Timeline
右侧：Step State
```

例如：

```text
10:22:01 S07 READY
10:22:04 pickup_open_end_wrench
10:22:05 WRONG_TOOL
10:22:08 put_down_open_end_wrench
10:22:12 pickup_torque_wrench
10:22:15 tightening
10:22:18 S07 COMPLETED
```

点击任何一条可以看到：

```text
输入Event
规则
状态变化
输出异常
```

这会极大降低系统调试成本。

---

# 七十八、为什么没有触发

Debugger 中最好提供：

> Why Not？

例如用户问：

> 为什么 S07 没完成？

系统显示：

```text
完成条件：

✓ 扭矩扳手
✓ 紧固动作
✕ 目标对象：未确认 bolt_A
```

这对实施人员极其重要。

否则只能让算法工程师查日志。

---

# 七十九、为什么触发异常

例如：

> 为什么系统认为错序？

显示：

```text
触发事件：
tighten_bolt_A

对应步骤：
S08

当前步骤：
S07

S08前置：
S07必须完成

当时：
S07 = IN_PROGRESS

因此：
STEP_OUT_OF_ORDER
```

这就是系统可解释性。

---

# 八十、步骤置信度

除了 Event confidence，Step 最终判断也可以存在：

```text
decisionConfidence
```

例如步骤由三个条件组成：

```text
0.96
0.92
0.71
```

最终：

```text
0.82
```

具体算法由技术实现。

一期产品层不一定展示。

但低 confidence 可以自动：

```text
REVIEW_REQUIRED
```

---

# 八十一、规则优先级

如果同时发生：

```text
WRONG_TOOL
SAFETY_VIOLATION
```

系统需要知道先处理什么。

建议异常 Severity：

```text
INFO
NORMAL
HIGH
CRITICAL
```

处理优先级：

```text
CRITICAL
>
HIGH
>
NORMAL
>
INFO
```

安全红线优先于普通教学提示。

---

# 八十二、同一时间多个异常

不能强制只保留一个。

例如学生：

> 没戴护目镜，同时拿错工具。

两条都应该保存。

但前端避免同时弹十条。

Feedback Policy 可以合并显示：

> 当前存在 2 项操作问题。

---

# 八十三、异常去重

学生持续拿着错误工具 10 秒。

不能每秒产生一次：

```text
WRONG_TOOL
```

因此 Exception Engine 也需要去重。

例如：

```text
同Step
同异常类型
同对象
在当前 Attempt 中
```

只生成一个 Exception。

---

# 八十四、异常再次发生

如果学生：

```text
第一次拿错
纠正
后来又拿错
```

应该形成：

```text
WRONG_TOOL #1
WRONG_TOOL #2
```

因为这是两次独立错误。

所以去重窗口应与：

```text
Exception lifecycle
```

结合。

---

# 八十五、Session 完成条件

整个 SOP 完成不应该只是：

> 最后一步完成。

建议：

```text
所有 required Step
均处于：
COMPLETED
或合法 SKIPPED
```

之后：

```text
Session → COMPLETED
```

如果仍有：

```text
REVIEW_REQUIRED
```

则：

```text
Session → REVIEW_REQUIRED
```

考试进入教师复核。

---

# 八十六、训练 Session 的完成

训练模式可以更宽松。

即使存在：

```text
已纠正异常
```

只要必做步骤最终完成：

```text
COMPLETED
```

报告中展示错误即可。

---

# 八十七、考试 Session 的完成

考试结束可能有三种：

```text
COMPLETED
REVIEW_REQUIRED
TERMINATED
```

### COMPLETED

AI和规则足以形成建议成绩。

### REVIEW_REQUIRED

存在 AI 不确定或系统异常，需要教师复核。

### TERMINATED

严重安全红线等导致提前终止。

---

# 八十八、考试结束操作

达到以下任一情况：

```text
全部步骤结束
学生主动交卷
考试时间到
教师终止
安全红线终止
```

进入：

```text
Finalize Session
```

系统执行：

```text
确认漏步
关闭进行中的 Attempt
确认超时
汇总异常
生成AI建议成绩
检查待复核项
生成视频时间轴
```

---

# 八十九、Finalization 非常重要

很多规则只有考试结束时才能最终确定。

例如：

```text
STEP_MISSING
```

所以不能只依赖实时判断。

建议分：

```text
Real-Time Rules
Finalization Rules
```

两套执行时机。

---

# 九十、Finalization Rules

一期至少包括：

```text
必做步骤是否遗漏
进行中步骤是否未完成
待确认异常是否需要复核
总考试时间是否超时
红线异常是否存在
系统异常是否影响成绩有效性
```

最终输出：

```text
SessionResult
```

---

# 九十一、Assessment Engine 的边界

SOP Runtime Engine 应该输出：

```text
步骤结果
异常
时间
证据
```

但不要直接负责复杂算分。

例如：

```text
S07 COMPLETED
WRONG_TOOL
TIMEOUT
```

交给：

> Assessment Engine。

Assessment Engine 再根据 Score Rule：

```text
5 - 2 - 1 = 2
```

这样评分和实时判定解耦。

---

# 九十二、为什么要把评分独立

因为同一套运行事实：

```text
WRONG_TOOL
```

不同学校可能：

```text
学校A：-2
学校B：-1
技能大赛：本步骤0分
```

不能让状态机知道这些。

---

# 九十三、运行模式也不要写进规则

例如：

```text
WRONG_TOOL
```

在训练和考试中都是 WRONG_TOOL。

区别是：

```text
TRAINING:
反馈

EXAM:
不反馈
```

所以：

```text
判定
反馈
评分
```

最好是三个相对独立层。

---

# 九十四、完整运行架构

最终实时链路：

```text
Camera / Sensor
↓
AI Event Engine
↓
Standard Event
↓
Event Router
↓
SOP Runtime Engine
↓
Step State Machine
↓
Exception Engine
↓
┌───────────────┬────────────────┐
│               │                │
Feedback Policy Assessment Engine Evidence Service
│               │                │
学生实时反馈      AI建议成绩        视频证据
```

这是一期技术架构的核心。

---

# 九十五、第一套 PoC 状态机不要做太复杂

一期 PoC 强烈建议限定：

```text
单人
单工位
单线性流程
无复杂分支
无多人协作
无循环
少量可选步骤
```

优先验证：

```text
正常步骤
错序
漏步
错工具
错误对象
超时
重复操作
AI不确定
教师人工确认
```

这些已经足够验证核心引擎。

---

# 九十六、首个 PoC 必须设计“故意犯错”

测试不能只是：

> 按标准 SOP 做十遍。

至少需要定义：

```text
Case 01 标准操作
Case 02 漏 S05
Case 03 S05/S06 交换
Case 04 S07拿错工具
Case 05 错工具后纠正
Case 06 重复执行S04
Case 07 S08做到一半退出
Case 08 操作超时
Case 09 AI故意遮挡产生不确定
Case 10 教师人工确认步骤
```

然后验证状态机是否符合教师判断。

---

# 九十七、测试用例应该成为 SOP 发布资产

未来每个 SOP Version 最好都有：

```text
Validation Test Cases
```

包括：

```text
测试动作
预期 Step 状态
预期异常
预期分数
```

这样 SOP 更新以后能够回归测试。

一期可以人工执行。

---

# 九十八、状态机回放

后期非常值得支持：

> Replay Session。

不用重新跑 AI 视频。

直接把历史 Event 按时间重新输入：

```text
SOP Runtime Engine
```

检查新规则下结果。

这对调试状态机非常有价值。

---

# 九十九、Event Replay 和 Video Re-analysis 区别

### Video Re-analysis

```text
视频
↓
新AI模型
↓
新Event
```

用于测试模型变化。

### Event Replay

```text
旧Event
↓
新SOP Rule
↓
新步骤结果
```

用于测试规则变化。

两个不能混淆。

---

# 一百、核心 Runtime 数据对象

一期建议至少包含：

```text
SOPRuntimeSession
StepRuntime
StepConditionRuntime
StepAttempt
RuntimeEventReference
StepException
RuntimeSystemException
FeedbackRecord
ManualIntervention
SessionFinalization
```

以及：

```text
RuntimeAuditLog
```

---

# 一百零一、StepRuntime 示例

```json
{
  "sessionId": "session_001",
  "stepId": "S07",
  "state": "COMPLETED",

  "readyAt": "10:22:00",
  "startedAt": "10:22:04",
  "completedAt": "10:22:18",

  "waitDurationMs": 4000,
  "operationDurationMs": 14000,

  "attemptCount": 2,

  "exceptionIds": [
    "ex_wrong_tool_01"
  ]
}
```

---

# 一百零二、Session 最终结果示例

```json
{
  "sessionId": "session_001",
  "result": "COMPLETED",

  "steps": {
    "total": 12,
    "completed": 12,
    "missing": 0,
    "reviewRequired": 0
  },

  "exceptions": {
    "wrongTool": 1,
    "outOfOrder": 1,
    "timeout": 0,
    "safetyViolation": 0
  },

  "durationSec": 522
}
```

评分由 Assessment Engine 单独生成。

---

# 一百零三、教师真正看到的不是“状态机”

虽然底层非常复杂，教师端不能显示：

```text
WAITING
READY
IN_PROGRESS
```

教师看到应该是自然业务语言。

例如：

```text
待操作
进行中
已完成
需要复核
存在异常
```

技术术语只出现在 Debugger。

---

# 一百零四、学生更不需要知道状态机

学生训练页面只显示：

```text
当前步骤
操作说明
是否正确
错误提示
```

不要显示：

```text
Step State = IN_PROGRESS
Condition 2/3
```

除非后期专门设计“高级训练调试模式”。

---

# 一百零五、教师实时监控中的状态

24 个工位列表可以统一成：

```text
正常
异常
待复核
暂停
已完成
离线
```

这些是 Session 层状态映射。

例如：

```text
某Step出现HIGH异常
→ 工位显示“异常”
```

让老师迅速找到需要干预的人。

---

# 一百零六、异常优先驾驶舱

教师监控首页不要平均展示 24 个大视频。

应该把：

```text
正在发生异常
```

的工位推到前面。

例如：

```text
⚠ 工位08
张三

当前：
S07 紧固螺栓

异常：
工具错误

持续：
8秒

[查看]
```

AI真正帮助教师的是：

> 管理注意力。

---

# 一百零七、状态机层最终核心价值

如果没有这层，系统本质上只是：

> AI动作识别 + 打标签。

有了这层以后才真正知道：

```text
现在应该做什么
实际做了什么
是否符合流程
错误是什么
错误后是否纠正
步骤是否最终完成
流程是否可以继续
```

也就是说，它把：

> 视频理解结果

转化成：

> 职业技能流程理解。

---

# 一百零八、一期成功标准

SOP Runtime Engine 一期成功不以“代码写完”为标准，而以真实测试结果为标准。

至少应达到：

第一，标准操作能够稳定走完整个 SOP，不产生明显错误异常。

第二，故意交换两个步骤，系统能够识别错序。

第三，故意漏一个必做步骤，结束时能够确认漏步。

第四，拿错工具后重新拿正确工具，既记录错误，又允许步骤最终完成。

第五，AI不确定时不乱扣分，而进入待复核。

第六，摄像头/AI服务异常时不会把系统问题算成学生错误。

第七，教师能够人工修正和接管。

第八，每一个步骤状态变化和异常都能追溯到对应 Event 与视频证据。

---

# 一百零九、这层最应该防止的架构错误

最需要避免的是：

```text
if event == pickup_wrong_tool:
    score -= 2
```

因为这里把：

```text
AI事件
SOP判断
评分规则
```

全部混在了一起。

长期一定不可维护。

应该保持：

```text
AI Event
↓
SOP Runtime
↓
Exception
↓
Assessment
```

四层清楚分开。

---

# 一百一十、最终一句话定义

> **SOP State Machine 的本质，是把学生连续、非结构化、可能出错、可能纠正的真实操作过程，转化为一条可解释、可评分、可复核的数字技能执行轨迹。**

AI Event Engine 告诉系统：

> 发生了什么。

SOP State Machine 告诉系统：

> 这件事在当前流程中意味着什么。

Assessment Engine 再告诉系统：

> 这件事应该如何评价。

这三层共同组成整套 AI-SOP 平台真正的核心引擎。
