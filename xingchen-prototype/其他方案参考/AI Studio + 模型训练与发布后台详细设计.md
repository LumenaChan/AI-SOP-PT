#

# AI Studio + 模型训练与发布后台详细设计

**版本：V1.0**  
**所属产品：AI 实训智能指导与考评平台**  
**模块定位：负责 AI 能力从需求、数据、训练、评估、发布到部署和持续优化的工程化管理平台**

---

# 一、模块定位

AI Studio 不是教师后台，也不是 SOP Editor 的高级设置页。

它服务的核心角色是：

```text
AI工程师
算法工程师
数据标注人员
AI产品管理员
实施人员
运维人员
```

它解决的问题不是：

> 学生应该做什么。

而是：

> 系统怎样可靠识别“学生做了什么”。

因此整个职责边界应保持：

```text
SOP Editor
负责：
业务规则和教学规则

AI Studio
负责：
AI能力实现和工程管理
```

两者通过：

> AI Event Capability

连接。

---

# 二、AI Studio 要解决的核心问题

一项新的 AI 能力从需求产生到正式上线，至少会经历：

```text
能力需求
↓
能力分析
↓
数据准备
↓
标注
↓
数据集
↓
模型训练
↓
模型评估
↓
Event构建
↓
场景验证
↓
发布
↓
边缘部署
↓
运行监控
↓
教师反馈
↓
困难样本回流
↓
模型迭代
```

如果没有统一后台，这些过程很容易散落在：

```text
本地文件夹
Excel
Label Studio
训练脚本
模型文件
Git
微信群
人工部署
```

第一所学校还能维护。

学校和 SOP 一多，基本就无法管理。

AI Studio 的目标，就是把这条链路产品化。

---

# 三、一期 AI Studio 的核心模块

建议一期至少包括：

```text
AI工作台
AI能力需求
事件能力库
对象能力库
视频样本库
标注任务
数据集管理
训练任务
模型管理
模型评估
Event Debugger
能力验证
模型发布
边缘部署
运行监控
反馈样本
```

其中真正核心的是：

> **能力需求 → 数据 → 模型 → Event → 验证 → 发布**

这条主链路。

---

# 四、AI工作台

AI Studio 首页不要一上来展示几十个 GPU 指标。

首先应该回答：

> 当前有哪些能力需要处理？

例如：

```text
AI能力总览

已发布 Event：32
测试中：7
开发中：5
待分析需求：8

对象模型：21
动作模板：11

在线边缘节点：28 / 30
异常节点：2
```

下面分三个区域：

```text
待处理能力需求
待验证能力
运行异常
```

---

# 五、AI能力需求

需求主要来自三个入口。

第一：

> SOP Editor 中教师申请新增 AI 能力。

第二：

> 实施人员在项目配置过程中提出。

第三：

> AI 团队主动发现已有能力需要优化。

例如：

```text
需求名称：
识别塞尺

来源：
发动机间隙测量 SOP

步骤：
S06

目标：
判断学生是否拿取塞尺

参考资料：
标准视频
图片
教师说明
```

---

# 六、能力需求状态

建议：

```text
待分析
分析中
可复用
需要配置
需要新增对象
需要新增事件
需要模型开发
开发中
测试中
待验证
已完成
不支持
```

这里“可复用”和“需要配置”非常重要。

因为新增需求不一定意味着：

> 新训练一个模型。

---

# 七、能力分析页面

技术人员拿到：

> 识别“拿取塞尺”

首先拆解：

```text
动作：
pickup
→ 已存在

对象：
feeler_gauge
→ 不存在

关系：
person_holding_object
→ 已存在

区域：
无特殊要求

结论：
新增对象识别能力
复用 pickup_object Event Template
```

然后系统生成实施方案。

这一步可以强迫团队优先思考：

> 能不能复用。

而不是立即开始训练。

---

# 八、能力实现方式

每个需求应明确实现方式：

```text
VISUAL
DEVICE
SENSOR
SPEECH
MANUAL
FUSION
```

例如：

### 拿取扭矩扳手

```text
VISUAL
```

### 扭矩达到35Nm

```text
SENSOR
```

### PLC程序运行完成

```text
DEVICE
```

### 学生口述“确认断电”

```text
SPEECH
```

### 教师判断装配质量

```text
MANUAL
```

这样避免所有问题都被强行转成视觉识别问题。

---

# 九、技术可行性结论

需求分析后至少需要选择：

```text
支持
条件支持
暂不支持
不建议AI实现
```

例如：

> 用普通 RGB 摄像头精确判断 35Nm 扭矩。

结论应该允许：

```text
不建议视觉实现
建议接入智能扭矩工具
```

产品不能因为项目销售需要，就逼算法“必须识别”。

---

# 十、能力优先级

可以按照：

```text
项目阻塞
核心通用
普通需求
优化项
```

管理。

例如某 SOP 发布被一个 Event 卡住：

```text
优先级：
P0 项目阻塞
```

而某个低频动作增强：

```text
P2
```

避免 AI 团队所有需求混在一起。

---

# 十一、视频样本库

所有训练视频不能只是服务器上的文件。

需要进入统一样本库。

每条视频至少记录：

```text
视频名称
来源学校
实训室
工位
摄像头
SOP
步骤
采集时间
分辨率
FPS
时长
用途
权限
```

用途例如：

```text
训练
验证
测试
线上反馈
困难样本
标准操作
```

---

# 十二、样本来源

建议支持：

```text
专门采集
标准视频
学生训练视频
学生考试视频
教师上传
线上误判回流
```

每一种来源都要有 sourceType。

后续评估模型泛化时很重要。

---

# 十三、数据权限

不同学校的数据不能默认混用。

每条数据至少有：

```text
tenantId
schoolId
dataUsageScope
```

用途可配置：

```text
仅本校使用
允许模型训练
允许匿名化后跨项目训练
```

具体权限需要在学校项目协议中明确。

产品数据模型必须提前支持。

---

# 十四、视频切片

模型训练通常不需要整段 20 分钟视频。

需要支持：

```text
整段视频
↓
生成 Clip
```

例如：

```text
00:42–00:47
拿取扭矩扳手
```

Clip 作为真正训练样本。

建议对象：

```text
Video
↓
VideoClip
```

而不是大量复制视频文件。

---

# 十五、Clip 来源

Clip 可以来自：

```text
人工截取
SOP步骤自动切片
Event自动切片
异常视频自动回流
```

这也是前面视频证据链产生的数据可以直接服务模型训练的原因。

---

# 十六、样本标签体系

标签建议统一来源于能力库。

例如：

```text
Object Labels
Action Labels
Relation Labels
State Labels
Region Labels
```

不要每个算法项目自己定义一套名字。

例如：

```text
torque-wrench
torque_wrench
TorqueWrench
扭矩扳手
```

必须统一成：

```text
code:
torque_wrench

displayName:
扭矩扳手
```

---

# 十七、对象标注

典型对象标注：

```text
Bounding Box
Polygon
Keypoint
```

一期主要：

```text
Bounding Box
```

即可。

例如：

```text
torque_wrench
bolt
part_A
safety_glasses
```

---

# 十八、动作标注

动作标注不要按单帧。

应该基于时间段：

```text
startTime
endTime
actionLabel
```

例如：

```text
00:12.42–00:13.88
pickup
```

如果有对象：

```text
pickup
object=torque_wrench
```

---

# 十九、关系标注

例如：

```text
person_holding_tool
```

需要关联：

```text
personTrack
toolTrack
timeRange
```

一期如果标注工具复杂，可以先让部分关系由规则生成。

不必所有东西人工标。

---

# 二十、状态标注

例如：

```text
part_installed
bolt_present
cover_closed
```

状态类数据通常可以按：

```text
Frame
或
时间区间
```

标注。

---

# 二十一、困难负样本

样本库必须有专门标签：

```text
HARD_NEGATIVE
```

例如：

```text
普通扳手长得像扭矩扳手
手碰工具但没有拿起
学生遮挡螺栓
工具只露出一部分
```

这类数据比重复采集大量简单正样本更有价值。

---

# 二十二、线上误判回流

教师在复核中心驳回：

```text
WRONG_TOOL
```

系统自动生成：

```text
Feedback Sample
```

包括：

```text
视频片段
AI原判断
教师最终判断
Event
模型版本
SOP
摄像头
```

AI人员可以：

```text
加入困难样本
忽略
重新标注
```

---

# 二十三、反馈样本状态

建议：

```text
待处理
确认AI误判
确认教师误操作
需要重新标注
已进入数据集
已关闭
```

不能教师一修改成绩，就自动把数据直接送去训练。

中间必须人工审核。

---

# 二十四、标注任务

数据管理员可以创建：

```text
标注任务
```

例如：

```text
任务：
扭矩扳手对象标注 V2

视频片段：
2,000

标签：
torque_wrench
open_end_wrench

标注要求：
……
```

分配给标注人员。

---

# 二十五、标注任务状态

```text
待开始
标注中
待质检
质检中
已完成
退回
```

即使一期团队小，也建议保留：

> 标注 + 质检

两个状态。

---

# 二十六、标注质检

不能直接认为：

> 标注完成 = 数据可用。

至少需要抽检：

```text
漏标
错标
类别错误
时间范围错误
```

一期可以人工抽检。

后期再做自动 QA。

---

# 二十七、标注规范版本

例如：

```text
“pickup”到底从什么时候开始？
```

如果团队理解不一致，数据会非常乱。

所以每个 Action Label 最好带：

```text
definition
positiveExamples
negativeExamples
annotationGuideVersion
```

例如：

> 当对象脱离原位置并与手同步运动持续 0.3 秒后，视为 pickup。

这也是 Event 定义的重要部分。

---

# 二十八、数据集管理

标注完成后不是直接训练。

先生成：

```text
Dataset
```

例如：

```text
tool_detection_ds_v1.3
```

包含：

```text
训练集
验证集
测试集
```

以及：

```text
数据来源
标签分布
场景分布
创建时间
```

---

# 二十九、数据集版本必须冻结

一旦用于正式训练：

```text
Dataset V1.3
```

不要继续往里面随意塞数据。

新增数据：

```text
V1.4
```

否则模型无法复现。

---

# 三十、训练/验证/测试划分

不能简单随机按帧切。

如果同一视频连续帧同时出现在：

```text
Train
Test
```

测试结果会虚高。

至少按：

```text
视频
学生
工位
采集批次
```

维度做隔离。

技术团队必须制定规范。

---

# 三十一、跨场景测试

产品真正关心的不是实验室测试集。

还应该有：

```text
不同学生
不同光线
不同工位
不同摄像头
不同学校
```

测试集。

因为真实部署差异很大。

---

# 三十二、数据集统计

例如：

```text
数据集：
Tool Detection V1.4

总图片：
28,431

类别：
torque_wrench     8,214
open_end_wrench   9,822
screwdriver       5,321
caliper           5,074
```

同时显示：

```text
学校覆盖
工位覆盖
光照场景
```

避免数据严重偏斜。

---

# 三十三、训练任务

创建：

```text
Training Job
```

至少选择：

```text
任务类型
数据集版本
基础模型
训练配置
输出名称
```

例如：

```text
任务：
Tool Detector V4.3

Dataset:
tool_ds_v1.4

Base:
YOLO...

目标：
增加塞尺识别
```

具体训练参数可以折叠在高级设置。

---

# 三十四、AI Studio 不要强绑定某一训练框架

后台对象应该抽象成：

```text
Training Job
Model Artifact
Evaluation
Deployment
```

至于底层使用：

```text
Ultralytics
PyTorch
MMDetection
自研脚本
```

由技术团队实现。

避免产品层变成某个框架的壳。

---

# 三十五、训练任务状态

建议：

```text
排队中
训练中
已完成
失败
已取消
```

页面展示：

```text
开始时间
持续时间
GPU
日志
输出模型
```

---

# 三十六、训练日志

一期不需要重造 TensorBoard。

可以提供：

```text
训练状态
loss趋势
基础指标
日志下载/查看
```

高级研发仍然可以使用原生工具。

AI Studio 重点是：

> 工程记录和产品化管理。

---

# 三十七、模型对象

每次训练完成生成：

```text
Model Version
```

例如：

```text
tool_detector
V4.3
```

基本信息：

```text
任务类型
训练数据集
模型文件
创建时间
指标
负责人
状态
```

---

# 三十八、模型状态

建议：

```text
EXPERIMENT
VALIDATED
STAGING
PRODUCTION
RETIRED
```

分别表示：

```text
实验
离线验证通过
场景测试
正式生产
停用
```

不能训练完成就直接：

> Production。

---

# 三十九、模型指标

目标检测模型可展示：

```text
Precision
Recall
mAP
per-class metrics
```

动作模型：

```text
Precision
Recall
F1
Confusion Matrix
```

但这些只是：

> 模型指标。

不能代替 Event 级业务指标。

---

# 四十、模型评估与 Event 评估必须分开

例如工具检测：

```text
mAP 很高
```

不代表：

```text
pickup_torque_wrench Event
```

一定可靠。

因为 Event 还涉及：

```text
Tracking
Hand Relation
Temporal Rule
```

所以必须存在两层：

```text
Model Evaluation
Event Evaluation
```

---

# 四十一、Event Capability 构建

模型可用后，技术人员进入：

```text
事件能力编辑器
```

例如创建：

```text
pickup_torque_wrench V1.4
```

选择：

```text
Event Template:
pickup_object

Object:
torque_wrench
```

依赖：

```text
tool_detector V4.3
person_detector V2
hand_keypoint V3
tracker V1.8
```

---

# 四十二、Event Rule

可以配置内部技术规则：

```text
手与工具距离阈值
工具位移阈值
同步运动时间
最小持续时间
确认阈值
Review阈值
Debounce
```

这些参数只给 AI/算法人员。

不要出现在 SOP Editor。

---

# 四十三、Event 版本

修改任何可能影响实际判定行为的核心参数：

```text
minDuration
confirmThreshold
模型组合
事件规则
```

都应该产生新的 Event Version。

例如：

```text
pickup_torque_wrench
V1.3
→
V1.4
```

---

# 四十四、Event 评估集

一个 Event 必须有专门测试集。

例如：

```text
pickup_torque_wrench
```

测试 case：

```text
标准拿取
快速拿取
缓慢拿取
只触碰
整理工具
拿错误工具
工具被遮挡
别人拿工具
```

这是业务级验证。

---

# 四十五、Event 评估指标

建议：

```text
Precision
Recall
False Positive
False Negative
Average Detection Delay
```

以及：

```text
Case Pass Rate
```

例如：

```text
标准拿取：
20 / 20通过

仅触碰：
19 / 20正确拒绝

遮挡拿取：
15 / 20识别成功
```

这比只看一个 F1 更容易理解。

---

# 四十六、场景验证

离线测试通过后，还必须进入真实工位验证。

因为：

```text
摄像头角度
光线
背景
工位摆放
学生习惯
```

都会影响结果。

所以建议：

```text
Event状态：
STAGING
```

然后绑定测试工位。

---

# 四十七、验证环境

可以指定：

```text
学校
实训室
工位
摄像头
SOP
```

例如：

```text
郑州测试实验室
Station 01–03
```

只让新 Event 版本在这些工位运行。

---

# 四十八、Shadow Mode

强烈建议后期支持：

> Shadow Mode。

即新模型/新 Event 版本：

```text
正常运行
但不影响正式 SOP 判定
```

只记录：

> 如果采用新版本，会产生什么结果。

然后与生产版本比较。

这会大大降低模型升级风险。

一期可以先做基础验证环境。

---

# 四十九、对比验证

例如：

```text
Production:
pickup_v1.3

Candidate:
pickup_v1.4
```

同一段视频同时跑。

比较：

```text
漏检
误检
延迟
教师修正率
```

确认新版本是否真的更好。

---

# 五十、模型不能因为离线指标高就自动发布

正式发布至少应该经过：

```text
离线模型测试
↓
Event测试
↓
真实工位验证
↓
SOP回归验证
```

其中最后一步尤其重要。

因为模型升级可能破坏已有 SOP。

---

# 五十一、SOP回归验证

例如更新：

```text
tool_detector V4.3
```

系统显示：

```text
受影响 Event：8
受影响已发布 SOP：17
```

选取关键 SOP 回放：

```text
历史 Event Test
或
视频重新分析
```

确认没有明显退化。

---

# 五十二、依赖图

AI Studio 应维护：

```text
Model
↓
Event
↓
SOP
↓
Task
```

例如：

```text
tool_detector V4.2
↓
pickup_torque_wrench
↓
减速器拆装 V1.2
↓
机械1班训练任务
```

这样一个模型升级时可以做影响分析。

---

# 五十三、发布对象

正式发布不能只理解成：

> 上传模型文件。

实际上需要发布：

```text
Model Version
+
Event Version
+
Runtime Config
```

形成：

```text
AI Capability Release
```

---

# 五十四、发布环境

建议至少区分：

```text
DEV
TEST
PRODUCTION
```

一期可以简化：

```text
测试
正式
```

但正式学生任务只能使用：

> Production 能力。

---

# 五十五、发布审批

一期如果团队小，可以：

```text
AI工程师提交
AI负责人发布
```

至少避免训练人员自己随手把实验模型推到学校。

---

# 五十六、正式发布前检查

例如：

```text
✓ 模型评估通过
✓ Event测试通过
✓ 场景验证通过
✓ 无阻断性回归问题
✓ 部署包生成成功
✓ 依赖版本完整
```

之后才能：

> 发布。

---

# 五十七、模型部署单位

部署不能只围绕：

```text
学校服务器
```

还要支持：

```text
Edge Node
```

例如：

```text
edge_001
```

负责：

```text
工位01–04
```

部署时需要知道：

```text
节点硬件
GPU/NPU
当前模型
剩余资源
负责摄像头
```

---

# 五十八、边缘节点对象

建议：

```text
EdgeNode
```

包含：

```text
nodeId
学校
实训室
IP
硬件型号
GPU/NPU
内存
磁盘
软件版本
在线状态
最后心跳
```

---

# 五十九、节点与工位关系

应该支持：

```text
一个节点
→ 多个工位
```

例如：

```text
EdgeNode-A
├── Station01
├── Station02
├── Station03
└── Station04
```

不要架构上强绑定：

> 一工位一盒子。

---

# 六十、模型部署策略

AI能力部署时可以指定：

```text
所有节点
指定学校
指定实验室
指定节点
```

例如：

```text
Tool Detector V4.3

先部署：
测试实验室 Node 01

验证后：
全部机械实训室
```

---

# 六十一、灰度发布

建议正式支持：

```text
10%
↓
30%
↓
100%
```

但学校项目节点数量可能较少。

一期可以做：

```text
指定节点发布
```

本质已经具备灰度能力。

---

# 六十二、部署状态

例如：

```text
待下发
下载中
安装中
运行中
失败
回滚中
```

不能发布以后不知道边缘端有没有真正加载成功。

---

# 六十三、版本一致性

中心平台必须知道：

```text
Node01：
tool_detector V4.3

Node02：
V4.2

Node03：
V4.3
```

否则同一个 SOP 在不同工位表现不同，却无法排查。

---

# 六十四、配置版本

除了模型，还需要管理：

```text
ROI
Camera Calibration
Event Parameters
Runtime Config
```

这些也会影响识别。

所以建议形成：

```text
Deployment Configuration Version
```

而不是只记录模型版本。

---

# 六十五、节点健康状态

一期至少监控：

```text
在线/离线
CPU
GPU/NPU
内存
磁盘
摄像头状态
AI服务状态
```

不需要做专业 APM。

但必须知道：

> 为什么某工位识别不了。

---

# 六十六、模型推理监控

可以逐步记录：

```text
FPS
平均推理延迟
GPU占用
Event延迟
异常次数
```

例如：

```text
Node03

Video FPS：25
AI FPS：18
平均Event延迟：0.8s
```

---

# 六十七、识别延迟必须与模型指标同样被关注

训练场景里：

```text
准确但慢5秒
```

很多时候并不可用。

所以每个部署版本都要关注：

```text
Accuracy
+
Latency
+
Resource Usage
```

---

# 六十八、运行时质量监控

真正上线以后，要统计：

```text
Event触发次数
AI_UNCERTAIN次数
教师修正次数
Event错误反馈
```

例如：

```text
pickup_torque_wrench V1.4

本周触发：8,421
待复核：214
教师驳回：63
```

---

# 六十九、线上指标比离线指标更重要

一个模型实验室：

```text
F1 = 97%
```

但上线后：

```text
教师修正率 12%
```

说明产品质量仍然有问题。

所以 AI Studio 首页后期应该同时展示：

```text
离线指标
+
线上业务指标
```

---

# 七十、线上质量指标

建议至少包括：

```text
Event Trigger Count
AI Uncertain Rate
Teacher Correction Rate
System Error Rate
Average Event Delay
```

---

# 七十一、教师修正率

定义：

```text
被教师判定为 AI 错误的 Event/Exception
/
进入教师复核的总量
```

具体口径后期要统一。

但趋势非常重要。

---

# 七十二、AI不确定率

例如：

```text
pickup_torque_wrench
```

在线：

```text
1000次尝试
70次进入UNCERTAIN
```

则：

```text
7%
```

如果某学校：

```text
25%
```

说明该部署环境可能有问题。

---

# 七十三、按学校查看质量

AI Studio 必须支持：

```text
全局
学校
实训室
工位
摄像头
```

分层查看。

同一个 Event：

```text
学校A 修正率 2%
学校B 修正率 14%
```

可能不是模型本身的问题。

而是：

```text
安装角度
光线
设备位置
```

---

# 七十四、场景漂移

真实使用一段时间后会发生：

```text
工具换型号
桌面布局变化
摄像头被移动
灯光变化
制服变化
```

这会导致模型效果下降。

AI Studio 应逐步支持发现：

> 线上效果异常变化。

一期先通过：

```text
教师修正率
AI_UNCERTAIN率
```

人工发现即可。

---

# 七十五、摄像头变更

摄像头重新安装后：

> ROI 和模型效果可能都变。

所以设备后台修改：

```text
Camera Position
```

最好触发：

```text
需要重新校验ROI
需要进行能力验证
```

后期可以产品化。

---

# 七十六、ROI版本

ROI 应属于：

```text
Camera Configuration
```

例如：

```text
camera03
tool_zone V1
assembly_zone V2
```

不能静态写死在模型代码里。

---

# 七十七、摄像头校准

一期只需要人工：

```text
查看画面
绘制ROI
保存
```

后期才考虑：

```text
自动标定
透视校准
3D空间
```

PoC 阶段没必要复杂化。

---

# 七十八、边缘节点部署失败

如果：

```text
Node03
部署 V4.3 失败
```

必须：

> 保持旧版本继续运行。

不能出现：

> 新版本失败后 AI 全部不可用。

所以部署策略建议：

```text
下载新版本
↓
校验
↓
切换
↓
健康检查
↓
成功
```

如果失败：

```text
回退旧版本
```

---

# 七十九、自动回滚

一期可以先支持手动回滚。

例如：

```text
当前：
V4.3

[回滚至V4.2]
```

点击：

```text
下发旧版本
```

并记录操作日志。

---

# 八十、为什么模型回滚很重要

因为真正上线以后最危险的不是：

> 模型训练失败。

而是：

> 新模型离线看起来更好，上线以后某些场景突然大量误判。

没有回滚能力会严重影响课堂。

---

# 八十一、模型回滚不应影响 SOP Version

例如：

```text
SOP V1.2
```

仍然不变。

底层 Event Capability 从：

```text
1.4
↓
1.3
```

回滚。

系统日志要记录当时实际使用的 Event 版本。

---

# 八十二、历史 Session 必须记录实际运行版本

每一场训练应该保存：

```text
SOP Version
Event Versions
Model Versions
Deployment Config
```

这样以后才能回答：

> 为什么 9 月这场考试和 10 月识别效果不同？

---

# 八十三、Model Registry

模型管理页本质上是：

> Model Registry。

至少支持：

```text
模型名称
任务类型
版本
来源训练任务
数据集
状态
指标
文件
依赖
发布时间
```

---

# 八十四、不要直接靠文件名管理模型

禁止团队长期使用：

```text
best.pt
best_final.pt
best_final2.pt
最新.pt
```

正式平台必须有：

```text
Model ID
Version
Hash
```

文件只是 Artifact。

---

# 八十五、模型 Artifact

一个 Model Version 可能包含：

```text
weights
config
labels
preprocessing
postprocessing
runtime
```

这些需要作为一套发布包。

避免只复制：

```text
xxx.pt
```

却忘记标签和预处理配置。

---

# 八十六、模型兼容性

每个模型可以标：

```text
Supported Runtime
```

例如：

```text
CUDA
TensorRT
ONNX Runtime
RKNN
```

如果未来用 RK3588 等边缘设备，模型可能需要不同 Artifact。

---

# 八十七、同一模型多个部署格式

例如：

```text
tool_detector V4.3
```

可能拥有：

```text
PyTorch Artifact
ONNX Artifact
TensorRT Artifact
RKNN Artifact
```

逻辑上仍然属于同一个模型版本。

不要分别变成四个模型。

---

# 八十八、模型转换任务

如果后期需要，可以增加：

```text
Model Conversion Job
```

例如：

```text
ONNX → TensorRT
```

一期 PoC 如果只跑 NVIDIA，可先不做复杂 UI。

但数据模型建议预留 Artifact 类型。

---

# 八十九、AI能力与硬件兼容

某个 Event 可能要求：

```text
GPU
```

另一个可以：

```text
NPU
```

所以 Event Capability 最好能标：

```text
minimumHardwareRequirement
```

部署时检查：

> 当前节点能否运行。

---

# 九十、资源预算

一个边缘节点同时跑多个能力：

```text
人物检测
工具检测
Pose
Tracking
动作模型
```

需要资源调度。

一期 PoC 可以由技术人员手工规划。

但后台至少展示：

```text
节点当前模型
GPU占用
推理负载
```

---

# 九十一、不要一个 Event 启动一套完整模型

例如：

```text
pickup_torque_wrench
pickup_screwdriver
pickup_multimeter
```

不应该各起：

> 一套 detector。

应共享：

```text
tool_detector
person_detector
tracker
```

然后 Event Engine 复用结果。

这是整体性能设计重点。

---

# 九十二、Inference Pipeline

底层更合理的是：

```text
视频帧
↓
共享基础检测
↓
共享跟踪
↓
共享Pose
↓
Feature / Entity State
↓
多个 Event Rule
```

而不是：

```text
每个SOP步骤
重新跑一次模型
```

否则算力无法扩展。

---

# 九十三、AI Studio 最终也要能看到 Pipeline

例如：

```text
Pipeline:
assembly_station_v2

Input:
camera_01

Models:
person_detector_v2
tool_detector_v4
pose_v3
tracker_v2

Events:
pickup_tool
put_down_tool
tightening
```

方便实施团队理解当前工位在跑什么。

---

# 九十四、Pipeline 与 SOP 解耦

同一个工位的 AI Pipeline 可以服务多个 SOP。

比如：

```text
机械装配基础
螺栓拆装
零部件检查
```

如果视觉环境相同，可以共用基础能力。

---

# 九十五、模型训练不是最终目标

AI Studio 应以：

> **Event 是否达到业务可用**

作为最终完成标准。

而不是：

> 模型训练完成。

例如工具 detector 训练很好，但：

```text
pickup_tool Event
```

仍然错误很多。

则能力状态仍然不能：

> 已发布。

---

# 九十六、能力验收

一个 AI Capability 发布前，应填写：

```text
验收场景
验收数据量
关键指标
已知限制
推荐机位
不适用场景
```

例如：

```text
能力：
pickup_torque_wrench

适用：
固定俯视/斜俯视工位

已知限制：
严重手部遮挡时可能进入UNCERTAIN
```

这种信息对实施非常重要。

---

# 九十七、能力“已知限制”

不要只宣传：

> 准确率 96%。

正式能力库必须允许写：

```text
已知限制
```

例如：

```text
低照度
强反光
工具完全遮挡
多个同类工具重叠
```

这样实施人员才能正确布置现场。

---

# 九十八、部署指南

每个核心 Event 可以关联：

```text
Camera Deployment Guide
```

例如：

```text
推荐高度：
1.8–2.2m

推荐俯角：
35°–50°

工具区必须完整可见
避免背光
```

这部分可能比继续调模型更能提高落地效果。

---

# 九十九、AI产品不是只有模型

真正落地质量：

```text
模型
+
摄像头安装
+
光照
+
ROI
+
工位规范
+
事件规则
+
SOP规则
```

任何一层出问题都会影响结果。

AI Studio 应帮助团队管理整个链路，而不仅是 weights。

---

# 一百、场景配置模板

后期可以形成：

```text
标准桌面装配工位
标准电气接线工位
标准拆装工位
```

每个模板包含：

```text
摄像头建议
ROI模板
推荐Pipeline
默认Event能力
```

能显著降低学校部署成本。

一期先不必产品化，但应作为长期方向。

---

# 一百零一、反馈闭环页面

建议专门做：

> AI反馈中心。

列表：

```text
来源学生
学校
SOP
步骤
原AI判断
教师判断
Event
模型版本
视频
状态
```

技术人员可以批量查看误判。

---

# 一百零二、误判分类

处理反馈时可以标记：

```text
对象误识别
动作误识别
跟踪丢失
遮挡
ROI错误
规则错误
SOP配置错误
教师误操作
数据质量问题
```

这样团队才能知道：

> 到底该改模型、Event规则还是SOP。

---

# 一百零三、这一点非常关键

所有“AI判错”不一定真是模型问题。

例如：

```text
Event正确
↓
SOP绑定错误
```

最终仍会产生错误成绩。

所以反馈调查必须能够逐层定位：

```text
模型层
Event层
SOP层
Assessment层
```

而不是统一扔给算法工程师。

---

# 一百零四、根因分析

一条误判反馈最终应有：

```text
Root Cause
```

例如：

```text
MODEL
EVENT_RULE
SOP_CONFIG
CAMERA_SETUP
SYSTEM
NOT_AI_ERROR
UNKNOWN
```

长期统计后，管理层会知道问题主要在哪里。

---

# 一百零五、AI反馈关闭条件

例如：

```text
已确认是模型问题
↓
加入 Dataset V1.5
↓
模型 V4.4 已修复
↓
回归测试通过
↓
关闭反馈
```

形成完整链路。

---

# 一百零六、困难样本池

反馈样本不要散落。

建立：

```text
Hard Sample Pool
```

可以按：

```text
Event
对象
错误类型
学校
场景
```

筛选。

后续创建新数据集时直接选：

> 将指定困难样本加入新版本。

---

# 一百零七、数据闭环指标

可以统计：

```text
本月新增困难样本
进入训练集比例
已修复反馈数量
平均修复周期
```

一期不必做 KPI 大屏。

但数据关系应保留。

---

# 一百零八、模型迭代记录

每个新版本可以写：

```text
V4.4

主要改进：
增加强反光工位数据
增加普通扳手困难负样本
修复塞尺漏检
```

然后关联：

```text
Feedback IDs
Dataset Version
```

这样版本演进清晰。

---

# 一百零九、不要自动从生产数据训练模型

一期明确禁止：

```text
教师纠正
↓
自动训练
↓
自动发布
```

风险太高。

合理流程：

```text
反馈
↓
人工审核
↓
进入数据集
↓
训练
↓
验证
↓
人工发布
```

自动化可以后续逐步增加。

---

# 一百一十、训练环境与生产环境隔离

AI工程师实验不应该影响：

> 正在上课的学校。

至少概念上分：

```text
Experiment
Validation
Production
```

训练环境模型随便试。

生产模型必须稳定。

---

# 一百一十一、数据回放环境

AI Studio 最有价值的工程工具之一，是：

> Video Replay / Event Replay。

### Video Replay

选择历史视频：

```text
使用新模型重新分析
```

### Event Replay

使用历史 Event：

```text
测试新的Event规则
```

这样很多测试不需要反复找真人重新操作。

---

# 一百一十二、回放结果对比

例如：

```text
原生产版本
vs
候选版本
```

显示：

```text
原Event时间
新Event时间
是否新增
是否漏失
置信度变化
```

并可跳视频。

这会极大提高调试效率。

---

# 一百一十三、Golden Dataset

随着产品成熟，建议维护：

> Golden Dataset。

它是一套人工严格确认的关键测试集。

覆盖：

```text
标准操作
典型错误
困难遮挡
各种工具
不同学生
不同环境
```

任何核心模型或 Event 升级必须跑。

---

# 一百一十四、Golden Test Cases

除了数据集，还要有业务测试案例。

例如：

```text
Case:
拿错普通扳手

预期：
pickup_open_end_wrench
必须触发

pickup_torque_wrench
不得触发
```

这比模型指标更直接保护产品行为。

---

# 一百一十五、AI Studio 与 SOP Validation 的关系

SOP Editor 中：

> 验证 SOP

实际会调用：

```text
已发布/测试中的 Event Capability
```

产生结果。

如果验证失败：

```text
S05 AI条件未触发
```

可以一键：

> 进入 Event Debugger。

这两个后台应该互相跳转。

---

# 一百一十六、从 SOP 反查 AI

例如：

```text
S07
pickup_torque_wrench
```

点击：

> 查看 AI 能力

进入：

```text
Event Capability Detail
```

实施人员可以立即知道：

```text
版本
状态
指标
已知限制
```

---

# 一百一十七、从 AI 反查 SOP

Event 详情页：

```text
当前引用：
12个 SOP Version
```

点击可以查看。

这样版本变更影响范围非常清楚。

---

# 一百一十八、正式 AI 能力删除

已被 SOP 引用的 Event：

> 不允许直接删除。

只能：

```text
停用
```

系统提示：

```text
当前被 12 个已发布 SOP 使用。
```

如果强制下线，必须先处理依赖。

---

# 一百一十九、对象能力同样不能随意删除

例如：

```text
torque_wrench
```

被多个 Event 引用。

删除前必须：

> 依赖检查。

因此能力库本质上需要：

```text
Dependency Management
```

---

# 一百二十、命名规范

AI Studio 从第一天就必须规定内部 Code。

例如：

```text
Object:
torque_wrench

Action:
pickup

Event:
pickup_torque_wrench
```

不要大量中文、拼音、临时名称混在一起。

UI 使用中文 Display Name。

底层统一 Code。

---

# 一百二十一、事件命名建议

推荐：

```text
verb_object
```

或者：

```text
subject_relation_object
```

例如：

```text
pickup_torque_wrench
putdown_torque_wrench
person_holding_torque_wrench
bolt_enter_assembly_zone
```

但最重要的是统一，不是某一种格式绝对正确。

---

# 一百二十二、对象分类体系

例如：

```text
TOOL
WORKPIECE
PPE
DEVICE
MATERIAL
CONTROL
```

然后：

```text
TOOL
├── WRENCH
│   ├── torque_wrench
│   └── open_end_wrench
├── screwdriver
└── pliers
```

分类便于复用和管理。

---

# 一百二十三、不要一开始建立极复杂 ontology

一期只覆盖 PoC。

随着专业增加再扩展。

否则很容易花几个月：

> 设计工业对象知识体系。

但产品还没有跑起来。

---

# 一百二十四、AI Studio 权限

一期建议：

### AI管理员

全部权限。

### AI工程师

数据、模型、Event开发。

### 实施人员

场景配置、ROI、验证、部署查看。

### 标注人员

样本和标注。

### 教师

不进入 AI Studio。

---

# 一百二十五、操作审计

关键操作必须记录：

```text
模型发布
Event发布
模型回滚
数据集修改
部署
ROI修改
能力停用
```

至少记录：

```text
操作人
时间
对象
原值
新值
```

---

# 一百二十六、一期 AI Studio 页面清单

严格压缩后建议：

```text
1. AI工作台
2. AI能力需求
3. Event能力库
4. 对象能力库
5. 视频样本库
6. 标注任务
7. 数据集
8. 训练任务
9. 模型管理
10. Event Debugger
11. 能力验证
12. 模型发布
13. 边缘节点
14. 部署管理
15. AI反馈中心
```

已经足够完整。

---

# 一百二十七、一期真正必须实现的页面

如果研发资源有限，还可以进一步压缩为：

```text
AI能力需求
Event能力库
样本库
数据集
模型管理
Event Debugger
部署管理
AI反馈中心
```

训练本身甚至可以继续通过工程脚本完成。

AI Studio 先负责：

> 管理和串联。

这比一开始重造完整 MLOps 平台更现实。

---

# 一百二十八、一个非常重要的产品边界

一期不建议自研：

```text
完整视频标注平台
完整GPU训练调度平台
完整实验跟踪平台
完整模型仓库系统
```

如果已有成熟开源工具完全可以接。

你们真正需要自研的是：

```text
SOP
↔
Event
↔
Model
↔
Deployment
↔
Feedback
```

之间的业务关系和闭环。

这是通用 MLOps 工具没有的。

---

# 一百二十九、哪些可以接现成工具

例如可以考虑：

```text
标注：
CVAT / Label Studio

实验跟踪：
MLflow

模型训练：
现有脚本 / Pipeline

对象存储：
MinIO / S3兼容

监控：
Prometheus / Grafana
```

AI-SOP 平台通过 ID 和 API 把这些工具串起来。

具体技术选型后续再定。

---

# 一百三十、不要把产品价值放在“我们自己做了标注工具”

学校不会因为你们自研了 Bounding Box 标注器而购买产品。

真正价值是：

> 新 SOP 的 AI 能力能否快速建立、验证和稳定部署。

所以一期应优先投入：

```text
能力管理
Event调试
SOP依赖
反馈闭环
部署
```

---

# 一百三十一、AI能力建设完整案例

例如新增：

> 拿取塞尺。

流程：

```text
SOP Editor
教师申请能力
↓
AI需求 #102
↓
能力分析
pickup 已有
feeler_gauge 不存在
↓
采集塞尺数据
↓
对象标注
↓
Dataset V1
↓
Tool Detector V4.4
↓
离线测试
↓
Event:
pickup_feeler_gauge V1
↓
Event Test
↓
工位验证
↓
SOP Validation
↓
正式发布
↓
边缘节点部署
↓
SOP可正式使用
```

以后第二个 SOP 也需要塞尺：

> 直接复用。

这就是平台化的真实过程。

---

# 一百三十二、另一个案例：不需要训练模型

教师申请：

> 判断螺丝刀是否放回工具区。

AI分析：

```text
screwdriver识别
已有

OBJECT_ENTER_REGION
已有

tool_zone
已有
```

直接生成：

```text
Event：
screwdriver_enter_tool_zone
```

无需新数据、无需训练。

几小时甚至更快即可完成。

这才是事件平台开始产生复用价值的表现。

---

# 一百三十三、再一个案例：应该用传感器

教师申请：

> 判断扭矩是否达到 35Nm。

AI分析：

```text
纯视觉不可靠
```

方案：

```text
智能扭矩扳手
↓
Sensor Adapter
↓
torque_measurement Event
```

SOP 直接引用。

这说明 AI Studio 应该逐步演化成：

> **Machine Perception Studio**

而不仅仅是“视觉模型后台”。

---

# 一百三十四、Sensor Adapter / Device Adapter

后期每种设备接入可通过：

```text
Adapter
```

转成统一事件。

例如：

```text
PLC Adapter
Torque Tool Adapter
Multimeter Adapter
```

最终都输出统一 Event Schema。

这和 Event Engine 架构完全一致。

---

# 一百三十五、AI Studio 长期演进方向

长期可以从：

```text
视觉模型管理
```

逐渐演进到：

```text
Perception Capability Platform
```

统一管理：

```text
视觉
语音
传感器
PLC
智能工具
```

但一期仍然以视觉为主。

---

# 一百三十六、一期 AI Studio 的成功标准

不是：

> 可以在线点按钮训练 YOLO。

真正成功标准应是：

第一，一个 AI 能力从需求到上线全程有明确记录。

第二，能够判断新增需求是复用能力还是需要新开发。

第三，模型和 Event 完全分离。

第四，一个模型可以支撑多个 Event。

第五，一个 Event 可以被多个 SOP 复用。

第六，模型升级可以知道影响哪些 SOP。

第七，新版本能够先验证再发布。

第八，边缘节点能够知道自己正在运行什么版本。

第九，出现问题可以快速回滚。

第十，教师误判反馈能够准确回流到对应 Event、模型和视频样本。

---

# 一百三十七、AI Studio 的核心 KPI

以后可以重点关注：

```text
新能力平均交付周期
Event复用率
对象复用率
新增SOP所需新Event数量
AI待复核率
教师修正率
Event平均检测延迟
模型回滚次数
线上问题修复周期
```

其中对商业化最关键的仍然是：

> **新 SOP AI 接入成本是否持续下降。**

---

# 一百三十八、与整个平台的最终关系

到这一层以后，整个产品架构基本完整：

```text
                     教师
                      │
                SOP Editor
                      │
                 AI Event需求
                      │
                  AI Studio
                      │
       数据 → 模型 → Event → 发布
                      │
                Edge Runtime
                      │
Camera / Sensor → AI Event Engine
                      │
                SOP State Machine
                      │
               Assessment Engine
                      │
           ┌──────────┴──────────┐
           │                     │
        学生训练              教师监控
           │                     │
           └──────────┬──────────┘
                      │
                 视频证据链
                      │
                 教师复核
                      │
                 学情分析
                      │
                 AI反馈样本
                      │
                  AI Studio
```

这里形成了一个真正完整的闭环。

---

# 一百三十九、整个产品现在已经出现两个核心“编辑器”

经过前面的设计，平台最关键的两个生产工具已经非常明确。

### SOP Editor

服务：

```text
教师
专业负责人
实施人员
```

解决：

> 教学规则如何数字化。

### AI Studio

服务：

```text
AI工程团队
```

解决：

> 机器能力如何建立。

二者通过：

```text
AI Event Capability
```

连接。

这实际上就是整个产品平台化的核心结构。

---

# 一百四十、一句话定义 AI Studio

> **AI Studio 的本质，不是一个在线训练模型的工具，而是一套管理“AI能力如何从业务需求产生、如何被数据支撑、如何经过验证、如何安全部署、如何被多个 SOP 复用、以及如何通过真实课堂反馈持续改进”的工程平台。**

最终希望实现的工作方式不是：

> 新项目来了，算法工程师重新从头写模型。

而是：

> 新 SOP 来了，先查已有 Event 能力；能复用的直接复用，缺失的能力才进入 AI Studio 建设，再沉淀回平台供未来项目继续使用。

当这个循环真正跑起来以后，AI-SOP 才从一个“高职实训项目”逐渐变成一个可以持续扩张的产品平台。


