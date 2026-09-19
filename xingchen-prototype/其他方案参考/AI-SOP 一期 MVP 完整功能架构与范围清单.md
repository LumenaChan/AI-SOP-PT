# AI-SOP 一期 MVP 完整功能架构与范围清单

**版本：V1.0**  
**产品名称：AI 实训智能指导与考评平台**  
**核心引擎：AI-SOP Engine**  
**一期定位：完成两个真实 SOP 的“配置—训练—识别—纠错—考评—复核—复盘”完整闭环，并验证第二个 SOP 的接入成本显著下降**

---

# 一、一期产品目标

一期不以“做出一个动作识别 Demo”为目标。

真正需要证明的是：

> **能够把教师掌握的标准操作规程，转化为机器可感知、可判断、可评分、可复核的数字 SOP，并在真实实训工位运行。**

一期至少需要完成两个真实 SOP。

第一个 SOP 用于证明：

> 技术链路和产品闭环可行。

第二个 SOP 用于证明：

> 已有 AI Event、对象能力、规则和页面可以被复用，系统开始具备平台属性。

---

# 二、一期成功标准

一期完成后至少应证明以下八件事：

1. 教师或实施人员能够通过 SOP Editor 配置一套真实实训流程。

2. AI Event Engine 能够把连续视频转成稳定的标准事件。

3. SOP Runtime 能够识别正常、漏步、错序、错工具、超时等典型情况。

4. 训练模式能够实时指导和纠错。

5. 考试模式能够静默记录并自动生成建议成绩。

6. 教师能够通过视频证据复核 AI 结果并修改最终成绩。

7. 学生能够查看具体错误、视频证据和标准操作。

8. 第二个 SOP 接入时，已有 Event 和对象能力能够明显复用。

---

# 三、一期核心角色

一期建议只保留五类核心角色。

## 3.1 学生

主要使用：

```text
我的实训
训练准备
实时训练
考试
训练报告
视频复盘
```

核心目标：

> 完成训练、接受纠错、参加考试、查看结果。

---

## 3.2 教师

主要使用：

```text
实训任务
实时监控
学生训练记录
成绩
复核
班级分析
```

核心目标：

> 管理课堂、按需介入、复核 AI、分析教学问题。

---

## 3.3 专业负责人 / SOP负责人

主要使用：

```text
实训项目
SOP管理
SOP Editor
评分规则
SOP版本
发布
```

核心目标：

> 把真实教学标准转成数字 SOP。

一期可与教师角色合并。

---

## 3.4 AI / 实施人员

主要使用：

```text
AI能力需求
Event能力库
对象能力库
样本
模型
Event Debugger
部署
反馈
```

核心目标：

> 建设和维护 AI 感知能力。

---

## 3.5 系统管理员

主要负责：

```text
账号
角色
专业
课程
班级
工位
摄像头
系统配置
```

一期权限体系不需要过于复杂。

---

# 四、整体产品端划分

一期产品建议拆成四个逻辑端。

```text
1. 教学管理端
2. 学生训练端
3. SOP / AI配置端
4. AI工程后台
```

其中 SOP Editor 可以放在教学管理端内，但权限单独控制。

---

# 五、整体一级菜单建议

## 教学管理端

```text
工作台
实训任务
实训项目
SOP管理
学生与班级
实时监控
成绩与复核
学情分析
工位设备
```

---

## 学生端

```text
我的实训
训练记录
```

学生产品尽量简单。

---

## AI Studio

```text
AI工作台
AI能力需求
事件能力库
对象能力库
视频样本
数据集
模型管理
事件调试
能力验证
部署管理
AI反馈
```

---

# 六、一期完整功能架构

建议划分为九个核心模块。

```text
01 基础教学管理
02 实训项目与SOP管理
03 SOP Editor
04 AI Event Engine
05 SOP Runtime Engine
06 学生实时训练
07 教师实训监控
08 智能考评与复核
09 视频复盘与基础学情
```

AI Studio 作为底层支撑模块贯穿其中。

---

# 七、模块一：基础教学管理

一期只做必要基础对象。

## 7.1 专业管理

字段：

```text
专业名称
专业编码
状态
```

例如：

```text
机械制造及自动化
机电一体化
```

---

## 7.2 课程管理

课程归属专业。

例如：

```text
机械装配技术
电气控制技术
```

---

## 7.3 班级管理

字段：

```text
班级
年级
专业
班主任/教师
状态
```

---

## 7.4 学生管理

字段：

```text
姓名
学号
班级
状态
```

一期支持：

```text
新增
编辑
Excel导入
```

---

## 7.5 教师管理

基础账号即可。

一期不做复杂教师组织体系。

---

# 八、模块二：实训项目管理

实训项目是课程下面真正用于训练的业务对象。

例如：

```text
课程：
机械装配技术

实训项目：
机械零部件标准装配
```

项目包含：

```text
名称
所属课程
说明
负责人
适用班级
默认SOP
状态
```

---

# 九、实训项目和 SOP 必须分离

关系：

```text
实训项目
↓
多个SOP
```

例如：

```text
减速器拆装实训

├── 基础训练SOP
├── 标准考试SOP
└── 技能大赛SOP
```

不要设计成：

```text
一个项目 = 一个SOP
```

---

# 十、模块三：SOP 管理

SOP 列表包含：

```text
SOP名称
所属项目
当前版本
状态
负责人
更新时间
引用任务数
```

状态：

```text
草稿
配置中
待验证
验证通过
已发布
已停用
```

核心操作：

```text
新建
编辑
复制
创建新版本
验证
发布
停用
```

---

# 十一、SOP Editor 一期范围

这是一期核心模块。

一期必须实现：

```text
步骤新增
步骤删除
步骤复制
步骤排序
步骤说明
标准图片
标准视频
是否必做
前置步骤
完成方式
AI Event绑定
完成条件
异常规则
评分规则
能力映射
发布校验
```

---

# 十二、SOP Editor 一期暂缓

一期暂不做：

```text
复杂条件分支
并行流程
循环
多人协作步骤
BPMN式流程设计
任意表达式编辑器
自动生成SOP
```

底层数据结构预留即可。

---

# 十三、步骤完成方式

一期必须支持三种：

```text
AI自动判断
人工确认
AI + 人工确认
```

这一设计是一期落地的重要降级机制。

例如：

```text
12个步骤

8个 AI自动
4个 教师确认
```

仍然允许整个 SOP 正常上线。

---

# 十四、SOP Step 核心字段

建议至少包括：

```text
Step ID
步骤序号
步骤名称
步骤说明
是否必做
前置步骤
是否允许重复
标准图片
标准视频
完成方式
识别条件
时间规则
异常规则
评分规则
能力映射
```

---

# 十五、模块四：AI Event Engine

一期不需要支持海量动作。

只建设 PoC 真正需要的能力。

一期第一套对象建议：

```text
person
hand
gloves
safety_glasses
part_A
bolt
torque_wrench
open_end_wrench
```

区域：

```text
tool_zone
assembly_zone
finished_zone
```

---

# 十六、一期基础 Event

建议控制在：

```text
object_detected
object_enter_region
object_leave_region
person_holding_object
pickup_object
put_down_object
tool_contact_target
tightening
```

状态：

```text
part_installed
bolt_present
tool_returned
```

随着第二个 SOP 再扩展。

---

# 十七、Event 必须标准化

所有上层业务只消费统一 Event。

例如：

```json
{
  "eventType": "ACTION_EVENT",
  "eventCode": "pickup_tool",
  "operator": "student_01",
  "subject": "torque_wrench",
  "startTime": "...",
  "endTime": "...",
  "confidence": 0.94
}
```

SOP 不直接依赖：

```text
YOLO
Pose
Tracking
```

---

# 十八、Event 和 SOP 的边界

Event Engine：

> 发生了什么。

例如：

```text
学生拿起开口扳手。
```

SOP Engine：

> 这件事在当前流程里是否正确。

例如：

```text
当前步骤要求扭矩扳手
→ WRONG_TOOL
```

这两个概念必须始终分离。

---

# 十九、模块五：SOP Runtime Engine

一期必须支持步骤状态：

```text
WAITING
READY
IN_PROGRESS
WAITING_CONFIRMATION
COMPLETED
SKIPPED
TIMEOUT
REVIEW_REQUIRED
```

---

# 二十、一期必须支持的异常类型

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
```

系统异常单独处理：

```text
CAMERA_OFFLINE
AI_ENGINE_OFFLINE
NETWORK_ERROR
```

系统异常绝不能直接给学生扣分。

---

# 二十一、一期运行模式

必须支持：

```text
训练模式
考试模式
```

共享：

```text
SOP
AI Event
状态机
异常判断
```

区别只是：

```text
Feedback Policy
```

---

# 二十二、训练模式

允许：

```text
显示当前步骤
显示操作要求
查看标准视频
实时错误提示
提示正确工具
允许纠错
学生求助
教师介入
```

目标：

> 帮学生完成训练。

---

# 二十三、考试模式

默认：

```text
不显示实时正确与否
不显示扣分
不提供标准视频
不提示正确答案
```

系统后台持续：

```text
记录步骤
记录异常
记录时间
保存证据
生成建议成绩
```

---

# 二十四、模块六：学生实时训练端

一期页面：

```text
我的实训
训练准备
实时训练
考试进行
训练完成
训练报告
视频复盘
```

---

# 二十五、学生实时训练页面核心

必须有：

```text
当前步骤
步骤要求
步骤进度
实时视频
标准操作
训练计时
实时提示
请求教师帮助
```

不要展示：

```text
模型名称
Event Code
置信度
技术日志
```

---

# 二十六、训练准备

启动 Session 前至少检查：

```text
工位已绑定
摄像头在线
AI服务正常
学生身份确认
训练资源已加载
```

通过后：

```text
开始训练
```

正式启动计时和判断。

---

# 二十七、学生错误提示

普通错误：

```text
当前工具选择不符合要求，请重新选择。
```

安全严重错误：

```text
检测到严重安全风险，请立即停止当前操作。
```

AI无法判断：

```text
当前操作未能准确识别，请重新执行。
```

连续无法判断：

> 转教师确认。

---

# 二十八、模块七：教师实时监控

教师监控不是视频墙。

一期首页必须突出：

```text
需要关注工位
```

优先级：

```text
严重安全
学生求助
AI无法判断
设备异常
高等级异常
长时间停滞
普通异常
```

---

# 二十九、教师驾驶舱顶部指标

一期展示：

```text
学生总数
正在训练
需要关注
已完成
暂停
设备异常
```

---

# 三十、工位卡片

每个工位：

```text
工位号
学生
当前步骤
进度
状态
最近异常
```

正常状态弱化。

异常状态强化。

---

# 三十一、教师单工位详情

必须支持：

```text
实时视频
当前步骤
最近异常
学生求助
AI待确认
系统状态
```

训练模式操作：

```text
确认操作正常
确认步骤完成
让学生重做
发送提示
暂停
终止
```

---

# 三十二、教师人工确认必须生成 Event

例如：

```text
MANUAL_CONFIRM_STEP
```

然后 SOP Runtime 正常消费。

不要在前端直接把数据库状态改成 Completed。

---

# 三十三、课堂共性问题

一期建议做一个非常基础的实时聚合：

```text
S07 工具错误：8人
S04 错序：5人
```

教师可以点击查看学生。

这是教师端较有差异化价值的功能。

---

# 三十四、模块八：Assessment Engine

一期评分模型建议保持透明：

```text
步骤标准分
-
异常扣分
=
步骤建议分
```

最低：

```text
0
```

整场：

```text
所有步骤得分合计
```

---

# 三十五、一期评分必须支持

```text
步骤基础分
异常扣分
累计扣分
最严重异常模式
漏步0分
安全红线
合格线
人工评分项
```

---

# 三十六、AI建议成绩不等于最终成绩

完整链：

```text
AI判断
↓
AI建议成绩
↓
教师复核
↓
最终成绩
```

尤其考试模式必须如此。

---

# 三十七、教师复核中心

一期必须实现：

```text
待复核列表
异常视频
AI判定
标准要求
AI置信度
评分影响
教师处理
```

教师操作：

```text
AI判断正确
AI判断错误
修改异常类型
人工确认步骤结果
```

---

# 三十八、AI误判处理

教师驳回：

```text
Exception → DISMISSED
```

系统：

```text
自动重算成绩
+
生成 AI Feedback
```

视频片段进入：

```text
AI反馈中心
```

形成数据闭环。

---

# 三十九、人工评分项

一期允许：

```text
AI负责：
步骤、顺序、工具、时间

教师负责：
复杂质量、综合表现
```

例如：

```text
AI自动评分 80分
教师人工评分 20分
```

但建议落到具体评分项，而不是模糊：

```text
AI 80%
教师 20%
```

---

# 四十、模块九：视频证据链

一期必须实现：

```text
完整录像
步骤时间轴
异常时间点
视频自动跳转
标准视频对照
教师复核证据
```

---

# 四十一、视频时间轴

至少三类节点：

```text
步骤
异常
教师/系统事件
```

例如：

```text
S01 ─ S02 ─ ⚠S03 ─ S04 ─ S05
```

点击异常：

> 自动播放对应前后片段。

---

# 四十二、学生训练报告

一期必须包含：

```text
成绩
完成步骤
总用时
异常次数
提示次数
重试次数
```

以及：

```text
主要问题
步骤明细
错误视频
标准视频
```

---

# 四十三、基础能力表现

一期可以显示：

```text
安全规范
流程规范
工具使用
操作规范
完成质量
操作熟练
```

但必须来自：

```text
Assessment Item → Ability
```

的明确映射。

不要让 LLM 自由生成。

---

# 四十四、班级学情分析一期范围

必须有：

```text
参与人数
完成人数
平均成绩
合格率
平均用时
高频异常
困难步骤
学生列表
教师介入次数
AI待复核数量
```

---

# 四十五、困难步骤至少展示

```text
异常率
一次成功率
平均重试
平均用时
教师介入率
```

不要一期创造一个黑盒：

> AI困难度指数。

---

# 四十六、AI Studio 一期定位

一期不建议自研完整 MLOps。

重点管理：

```text
业务需求
Event
模型
部署
反馈
```

训练、标注可以接成熟工具。

---

# 四十七、AI Studio 一期必须有

```text
AI能力需求
Event能力库
对象能力库
视频样本
数据集记录
模型管理
Event Debugger
能力验证
部署管理
AI反馈中心
```

---

# 四十八、Event Debugger

一期非常重要。

选择视频后展示：

```text
视频
+
Event Timeline
+
当前Event状态
```

例如：

```text
10:01:04 torque_wrench detected
10:01:06 hand contact
10:01:07 pickup confirmed
```

用于解释：

> 为什么 SOP 没触发。

---

# 四十九、Why Not 分析

一期建议至少做到：

```text
为什么S07没有完成？

✓ 工具正确
✓ 动作正确
✕ 目标对象未确认
```

这会极大提高实施和调试效率。

---

# 五十、模型发布与边缘部署

一期不需要复杂 Kubernetes/MLOps UI。

但必须知道：

```text
哪个节点
正在运行哪个模型版本
哪个Event版本
```

支持：

```text
测试发布
正式发布
手工回滚
```

---

# 五十一、工位与设备管理

一期必须有：

```text
实训室
工位
摄像头
边缘节点
```

关系：

```text
实训室
└── 工位
    ├── 摄像头
    └── 边缘节点
```

---

# 五十二、摄像头一期能力

```text
添加
编辑
在线状态
画面预览
绑定工位
ROI配置
```

暂时不做：

```text
自动标定
自动机位优化
复杂视频运维
```

---

# 五十三、ROI

支持人工画：

```text
工具区
装配区
成品区
危险区
```

保存：

```text
Region
```

作为正式业务对象。

---

# 五十四、边缘计算一期策略

PoC 阶段可以：

```text
摄像头
↓
NVIDIA GPU电脑
↓
Event Engine
```

不必一开始定制硬件盒子。

但软件架构必须支持未来：

```text
一个Edge Node
管理多个工位
```

---

# 五十五、一期推荐的核心页面总表

| 端   | 页面                 | 优先级 |
| --- | ------------------ | --- |
| 管理  | 工作台                | MVP |
| 管理  | 专业管理               | MVP |
| 管理  | 课程管理               | MVP |
| 管理  | 班级/学生              | MVP |
| 教师  | 实训项目               | MVP |
| 教师  | SOP列表              | MVP |
| 教师  | **SOP Editor**     | 核心  |
| 教师  | 实训任务               | MVP |
| 教师  | **实时监控驾驶舱**        | 核心  |
| 教师  | 单工位详情              | MVP |
| 教师  | 成绩列表               | MVP |
| 教师  | **教师复核中心**         | 核心  |
| 教师  | 成绩详情               | MVP |
| 教师  | 班级分析               | MVP |
| 学生  | 我的实训               | MVP |
| 学生  | 训练准备               | MVP |
| 学生  | **实时训练**           | 核心  |
| 学生  | 考试                 | MVP |
| 学生  | 训练报告               | MVP |
| 学生  | **视频复盘**           | 核心  |
| AI  | AI能力需求             | MVP |
| AI  | Event能力库           | MVP |
| AI  | 对象能力库              | MVP |
| AI  | 样本/数据集             | MVP |
| AI  | 模型管理               | MVP |
| AI  | **Event Debugger** | 核心  |
| AI  | 部署管理               | MVP |
| AI  | AI反馈中心             | MVP |
| 系统  | 实训室/工位             | MVP |
| 系统  | 摄像头                | MVP |

真正值得重点打磨原型的六个页面是：

> **SOP Editor**  
> **学生实时训练**  
> **教师实时监控驾驶舱**  
> **教师复核中心**  
> **视频复盘**  
> **Event Debugger**

其他页面可以先做标准后台形态。

---

# 五十六、一期完整主业务流程

## 流程 A：SOP 建设

```text
创建实训项目
↓
新建SOP
↓
拆分步骤
↓
上传标准内容
↓
配置步骤依赖
↓
绑定AI Event
↓
配置异常规则
↓
配置评分
↓
验证SOP
↓
发布版本
```

---

# 五十七、流程 B：缺少 AI 能力

```text
教师配置Step
↓
缺少AI Event
↓
申请新增AI能力
↓
AI人员分析
↓
复用 / 新增对象 / 新开发Event
↓
数据准备
↓
模型/Event验证
↓
发布
↓
返回SOP绑定
↓
重新验证
```

---

# 五十八、流程 C：训练

```text
教师创建训练任务
↓
绑定班级
↓
绑定SOP Version
↓
学生进入工位
↓
环境检查
↓
开始训练
↓
AI Event
↓
SOP Runtime
↓
实时步骤判断
↓
异常提示
↓
学生纠错
↓
完成训练
↓
训练报告
↓
视频复盘
```

---

# 五十九、流程 D：课堂教师管理

```text
任务开始
↓
教师进入驾驶舱
↓
系统监控所有工位
↓
Attention Engine筛选问题工位
↓
教师查看
↓
人工确认 / 提示 / 暂停
↓
课堂结束
↓
班级分析
```

---

# 六十、流程 E：考试

```text
创建考试任务
↓
学生进入工位
↓
开始考试
↓
系统静默识别
↓
步骤/异常记录
↓
学生提交
↓
Session Finalization
↓
AI建议成绩
↓
教师复核
↓
人工评分
↓
最终确认
↓
成绩发布
```

---

# 六十一、流程 F：AI误判闭环

```text
AI产生异常
↓
教师复核
↓
确认AI误判
↓
生成AI Feedback
↓
进入反馈中心
↓
技术人员分析
↓
模型/Event/SOP/ROI根因
↓
加入困难样本
↓
模型升级
↓
验证
↓
重新发布
```

---

# 六十二、核心数据对象总表

一期建议至少有：

## 教学对象

```text
Major
Course
Class
Student
Teacher
TrainingProject
TrainingTask
```

## SOP 对象

```text
SOP
SOPVersion
SOPStep
StepDependency
StepInstruction
StepRecognitionRule
StepExceptionRule
StepScoreRule
AssessmentItem
Ability
```

## AI 对象

```text
AIObject
AIEventTemplate
AIEventCapability
Model
ModelVersion
Dataset
VideoSample
Region
Camera
EdgeNode
```

## Runtime 对象

```text
RuntimeSession
StepRuntime
StepConditionRuntime
StepAttempt
Event
Exception
SystemException
FeedbackRecord
AttentionEvent
ManualIntervention
```

## 考评对象

```text
Assessment
StepAssessment
TeacherReview
ManualScore
ScoreAdjustment
AssessmentVersion
```

## 证据对象

```text
Video
Evidence
TrainingReport
```

---

# 六十三、一期核心关系

最重要关系是：

```text
TrainingProject
↓
SOP
↓
SOPVersion
↓
Step
↓
Recognition Rule
↓
AI Event Capability
↓
Model / Rule
```

运行时：

```text
Task
↓
Session
↓
Step Runtime
↓
Event
↓
Exception
↓
Assessment
↓
Evidence
```

这两条关系必须从架构阶段就保持清晰。

---

# 六十四、一期必须坚持的五个解耦

## 第一

```text
SOP
≠
AI模型
```

## 第二

```text
AI Event
≠
步骤
```

## 第三

```text
Exception
≠
Score
```

## 第四

```text
教师需要关注
≠
学生应该扣分
```

## 第五

```text
系统错误
≠
学生错误
```

只要这五个关系不混，后期系统可扩展性会好很多。

---

# 六十五、一期明确不做

这一部分建议直接写进项目范围，防止需求失控。

一期明确不做：

```text
VR/AR教学
数字孪生
复杂三维工厂
LLM自动生成完整SOP
自然语言直接生成AI识别规则
通用动作大模型
多人协作SOP
复杂BPMN
正式考试申诉仲裁
多教师双评
跨学校资源市场
复杂技能等级认证
知识图谱
AI教师数字人
全校大数据驾驶舱
复杂自研标注工具
复杂自研MLOps
```

---

# 六十六、P1 建议范围

一期稳定后优先增加：

```text
多机位
语音Event
PLC/设备Event
Sensor Event
更完整SOP版本对比
条件分支
可选步骤
能力趋势
课程级分析
典型错误案例库
模型灰度发布
Shadow Mode
模型自动回滚
```

---

# 六十七、P2 建议范围

进一步成熟后：

```text
多人协作SOP
并行流程
复杂分支
职业技能考试仲裁
学生申诉
多教师双评
跨校能力库
标准SOP市场
自动SOP视频切分
AI辅助SOP生成
LLM教学诊断
复杂能力画像
设备联动停机
数字孪生
```

---

# 六十八、第一套 PoC SOP 建议

仍然建议选择：

> **机械零部件标准装配**

原因：

```text
工位固定
步骤明确
工具有限
对象明显
顺序稳定
遮挡较低
结果容易观察
```

建议：

```text
10～12步
```

即可。

---

# 六十九、第一套 PoC 示例步骤

例如：

```text
S01 检查PPE
S02 检查工件
S03 拿取零件A
S04 放入装配位置
S05 拿取螺栓
S06 安装螺栓
S07 拿取扭矩扳手
S08 第一次紧固
S09 第二次紧固
S10 检查装配状态
S11 工具归位
S12 完成
```

---

# 七十、第一套 PoC 要刻意设计异常

必须测试：

```text
标准操作
漏步
错序
错工具
错误对象
重复操作
超时
错误后纠正
AI无法判断
教师人工确认
摄像头掉线
```

不是只找人按照正确步骤做 100 次。

---

# 七十一、第二套 PoC 怎么选

第二套不要和第一套完全一样。

也不要完全不同。

建议：

> **简单机械拆卸 SOP**

这样可以复用：

```text
人
手
扳手
螺栓
拿取
放置
工具区
装配区
```

新增：

```text
loosening
remove_part
```

从而真正验证：

> Event 复用。

---

# 七十二、一期核心产品 KPI

建议至少关注六组。

## 72.1 AI识别

```text
Event Precision
Event Recall
Event Latency
```

---

## 72.2 SOP判定

```text
正确步骤识别率
漏步检出率
错序检出率
错工具检出率
```

---

## 72.3 人机协同

```text
AI自动考评覆盖率
AI待复核率
教师修正率
教师介入率
```

---

## 72.4 学生训练

```text
完成率
异常次数
重试次数
提示次数
独立完成情况
```

---

## 72.5 教师价值

```text
需要人工介入的Session比例
高频异常自动发现率
复核平均处理量
```

---

## 72.6 平台化指标

最关键：

```text
Event复用率
对象复用率
新增Event数量
新增模型数量
数据采集量
标注工时
算法开发工时
SOP配置工时
总接入周期
```

---

# 七十三、平台化最重要的验收指标

第一套 SOP 可能需要：

```text
40人日
```

第二套如果仍然：

```text
38人日
```

说明平台化失败。

如果变成：

```text
第一套：40
第二套：22
第三套：12
```

才说明：

> 能力资产开始复用。

所以建议把：

> **新 SOP 平均接入周期**

列入最核心长期 KPI。

---

# 七十四、一期技术架构建议

高层结构建议：

```text
Web管理端
学生训练端
        │
        ↓
API / Realtime Gateway
        │
        ├──────── Teaching Service
        │
        ├──────── SOP Service
        │
        ├──────── Runtime Engine
        │
        ├──────── Assessment Service
        │
        ├──────── Evidence Service
        │
        └──────── AI Capability Service
                          │
                          ↓
                    Event Engine
                          │
                    Edge Runtime
                          │
           ┌──────────────┼──────────────┐
           │              │              │
        Camera          Device         Sensor
```

一期物理部署可以简单。

逻辑边界先分清楚。

---

# 七十五、实时链路

最核心的数据流：

```text
Camera
↓
Model Inference
↓
Entity / Tracking
↓
AI Event Engine
↓
Standard Event
↓
SOP Runtime
↓
Step State / Exception
↓
Feedback Policy
↓
学生端
```

并行：

```text
Exception / Attention
↓
教师端
```

考试结束：

```text
Runtime Result
↓
Assessment
↓
Teacher Review
↓
Final Result
```

---

# 七十六、离线链路

```text
训练视频
↓
Evidence
↓
教师复核
↓
AI Feedback
↓
Sample
↓
Dataset
↓
Model
↓
Event Version
↓
Deployment
```

形成完整 AI 数据闭环。

---

# 七十七、一期开发顺序

不建议按照：

> 用户管理 → 专业 → 课程 → 班级 → 一堆后台

这种传统方式从外围开始。

建议围绕核心链开发。

### 第一阶段

确定真实 PoC SOP。

拿到：

```text
实训指导书
评分表
标准视频
教师说明
```

---

### 第二阶段

完成：

```text
Event Schema
Step Schema
Exception Schema
Runtime Schema
```

先定核心数据模型。

---

### 第三阶段

开发：

> SOP Editor 核心链路。

可以人工模拟 AI Event。

先验证产品模型。

---

### 第四阶段

做：

> AI Event PoC。

先识别第一批对象和动作。

---

### 第五阶段

接通：

```text
AI Event
→
Runtime Engine
```

跑通正常和异常状态机。

---

### 第六阶段

做学生实时训练。

---

### 第七阶段

做教师监控。

---

### 第八阶段

做 Assessment + 教师复核。

---

### 第九阶段

做视频时间轴和学生报告。

---

### 第十阶段

补：

```text
班级分析
AI Studio基础管理
设备管理
```

---

# 七十八、原型设计顺序

如果现在让 Codex 开始做原型，我建议按：

```text
1. SOP列表
2. SOP Editor
3. 学生实时训练
4. 教师实时监控
5. 单工位详情
6. 教师复核中心
7. 视频复盘
8. 学生训练报告
9. 班级分析
10. Event能力库
11. Event Debugger
12. 工位设备管理
```

先把核心故事讲通。

再补标准后台。

---

# 七十九、第一版原型不要追求真的接 AI

产品原型阶段可以全部使用模拟事件。

例如点击：

```text
模拟错误工具
```

前端触发：

```text
WRONG_TOOL
```

用来验证：

```text
提示
状态变化
教师端同步
评分
视频节点
```

这比等算法全部做完再验证产品交互效率高得多。

---

# 八十、建议为原型提供“演示控制台”

PoC 原型里可以增加一个仅内部可见的：

> 演示控制台。

例如按钮：

```text
正常完成当前步骤
模拟拿错工具
模拟错序
模拟AI不确定
模拟设备离线
模拟安全违规
```

这样给老板、教师演示时可以完整展示系统价值。

正式产品隐藏。

---

# 八十一、一期 PRD 后续章节结构建议

后续如果正式写 PRD，我建议采用：

```text
第一章 产品背景
第二章 产品目标
第三章 用户与角色
第四章 产品范围
第五章 核心业务模型
第六章 系统总体架构
第七章 实训项目与SOP
第八章 SOP Editor
第九章 AI Event Engine
第十章 Runtime Engine
第十一章 学生实时训练
第十二章 教师监控
第十三章 Assessment与复核
第十四章 视频证据与复盘
第十五章 学情分析
第十六章 AI Studio
第十七章 工位与设备
第十八章 权限
第十九章 数据与日志
第二十章 异常与降级
第二十一章 性能指标
第二十二章 MVP验收
第二十三章 后续规划
```

这样就已经足够作为真正研发输入。

---

# 八十二、这套产品当前最重要的三条主线

经过前面所有拆解，现在可以进一步收敛成三条主线。

### 第一条：教学标准数字化

```text
教师经验
↓
SOP Editor
↓
Digital SOP
```

### 第二条：真实操作结构化

```text
摄像头 / 设备
↓
AI Event Engine
↓
Operation Events
```

### 第三条：过程评价数字化

```text
Operation Events
↓
SOP Runtime
↓
Assessment
↓
Evidence
↓
Learning Analytics
```

---

# 八十三、真正的核心壁垒

这套产品长期最难复制的并不是：

> 某个 YOLO 权重。

而是逐步积累出的：

```text
行业SOP资产
+
AI Event能力库
+
真实实训视频数据
+
困难错误样本
+
SOP到机器Event的映射经验
+
学校真实评分规则
```

这些东西随着项目越来越多会形成复利。

---

# 八十四、商业上应该避免变成“项目外包平台”

未来每来一所学校，如果都是：

```text
重新调研
重新写SOP
重新训练所有模型
重新开发页面
```

那本质仍然是定制项目。

真正的平台化目标应该是：

```text
标准软件平台
+
行业SOP包
+
少量AI能力扩展
+
现场部署配置
```

项目交付主要做：

```text
SOP配置
能力复用
少量新增Event
现场校准
```

而不是重新开发系统。

---

# 八十五、未来产品形态可以逐渐变成“三层商品”

长期可以形成：

### 平台产品

```text
AI实训智能指导与考评平台
```

### 专业能力包

例如：

```text
机械装配AI能力包
电气实训AI能力包
汽修AI能力包
```

### SOP资源包

例如：

```text
减速器拆装
PLC接线
发动机拆装
```

这样商业模式会比：

> 一个项目一套软件

更可复制。

---

# 八十六、一期阶段最重要的风险

当前最大风险并不是后台页面做不出来。

真正的风险有四个：

### 风险一：动作事件稳定性不够

尤其：

```text
遮挡
小零件
相似工具
快速动作
```

---

### 风险二：真实 SOP 不能很好拆成机器可观测事件

有些老师判断步骤正确依靠：

> 经验和细节。

AI未必能直接获得这些信息。

---

### 风险三：过度追求100%自动化

会导致 PoC 周期失控。

必须允许：

> AI + 人工确认。

---

### 风险四：第一个 SOP 做得很好，但完全无法复用

这说明做的是：

> Demo。

不是：

> 平台。

---

# 八十七、一期产品最高原则

整个一期开发过程中，遇到功能争议时，可以用一句话判断：

> **这个功能是否有助于把真实 SOP 更稳定地转化成机器可执行流程，或者有助于验证这种能力是否能复制到第二个 SOP？**

如果答案是否：

> 一期就可以先不做。

---

# 八十八、最终一期范围总结

一期真正要完成的是：

```text
教学基础管理
+
实训项目
+
SOP Editor
+
基础AI Event能力
+
SOP Runtime
+
训练/考试
+
教师实时监控
+
AI考评
+
教师复核
+
视频证据
+
训练报告
+
基础班级分析
+
基础AI Studio
+
工位设备管理
```

围绕两个真实 SOP 完成验证。

---

# 八十九、一句话定义一期 MVP

> **AI-SOP 一期 MVP 的目标，是在真实职业实训工位中，完成“标准 SOP 数字化—操作事件识别—实时流程判断—训练纠错—自动考评—教师复核—视频复盘”的完整闭环，并证明同一套底层 AI 事件和规则能力可以被第二个 SOP 明显复用。**

这应该成为一期所有产品、研发、算法和验收工作的统一边界。
