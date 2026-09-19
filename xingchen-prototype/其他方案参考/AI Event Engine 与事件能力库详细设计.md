# AI Event Engine 与事件能力库详细设计

**版本：V1.0**  
**所属产品：AI 实训智能指导与考评平台**  
**模块定位：SOP Engine 与底层 AI 模型之间的标准事件中间层**

---

# 一、模块定位

AI Event Engine 是整套 AI-SOP 平台最核心的底层能力之一。

它不直接负责判断：

> 学生是否完成了 SOP 第 7 步。

它真正负责的是：

> 将摄像头、设备、传感器等连续原始数据，转化成结构化、标准化、可复用的“操作事件”。

例如摄像头原始画面经过模型和规则处理后，不直接输出：

```text
学生正在执行第7步。
```

而应该输出：

```text
学生01
在装配区域A
拿着扭矩扳手
对螺栓A
执行紧固动作
持续3.4秒
```

形成标准事件：

```json
{
  "eventType": "ACTION",
  "eventCode": "tighten_bolt",
  "operatorId": "student_01",
  "tool": "torque_wrench",
  "target": "bolt_A",
  "region": "assembly_zone_A",
  "startTime": "2026-09-18T10:32:15.221",
  "endTime": "2026-09-18T10:32:18.621",
  "duration": 3.4,
  "confidence": 0.94
}
```

之后 SOP Engine 再判断：

> 这个事件是否满足当前步骤的完成条件。

因此整个架构应严格保持：

```text
AI模型
↓
AI Event Engine
↓
标准事件
↓
SOP Engine
↓
步骤状态
↓
评分与教学应用
```

---

# 二、为什么必须增加 Event Engine

如果不做这一层，最容易形成的架构是：

```text
YOLO
↓
识别到扳手
↓
业务代码
↓
S07完成
```

然后第二个 SOP 又写：

```text
YOLO
↓
识别到扳手
↓
另一段业务代码
↓
S12完成
```

第三个 SOP 再写一遍。

最终会出现：

> 模型能力、业务规则和具体 SOP 高度耦合。

结果就是每新增一个实训项目都需要研发介入。

Event Engine 的价值就是将：

> **AI能力**

和：

> **教学业务**

彻底分离。

例如平台统一存在一个事件：

```text
pickup_torque_wrench
```

任何 SOP 都可以引用它。

机械装配可以用。

发动机拆装可以用。

轨道设备维修也可以用。

---

# 三、整个系统的事件层级

建议将 AI 能力拆为四级。

```text
原始检测结果
↓
基础感知
↓
原子事件
↓
复合事件
↓
业务SOP
```

分别来看。

---

# 四、第一级：原始检测结果

这是最底层模型输出。

例如：

```text
Frame 12532

person
bbox=(...)
confidence=0.98

torque_wrench
bbox=(...)
confidence=0.93

bolt
bbox=(...)
confidence=0.89
```

或者姿态模型输出：

```text
left_wrist=(432,288)
right_wrist=(502,296)
left_elbow=(401,241)
...
```

这一层属于：

> AI模型内部结果。

原则上不能直接暴露给 SOP Editor。

---

# 五、第二级：基础感知对象

系统将底层模型结果统一转换为标准对象。

例如：

```json
{
  "entityType": "TOOL",
  "entityCode": "torque_wrench",
  "trackId": "obj_302",
  "bbox": {
    "x": 0.33,
    "y": 0.52,
    "w": 0.12,
    "h": 0.19
  },
  "confidence": 0.93
}
```

标准对象主要包括：

```text
PERSON
TOOL
WORKPIECE
PPE
DEVICE
REGION
HAND
OBJECT_STATE
```

这一层的目标是屏蔽不同模型实现差异。

例如未来把：

```text
YOLOv11
```

换成：

```text
RT-DETR
```

上层事件定义不应该发生变化。

---

# 六、第三级：原子事件

原子事件代表一个相对明确、可复用的基础行为。

一期建议重点支持：

```text
拿取
放置
进入区域
离开区域
接触
移动
插入
拔出
按压
旋转
紧固
松开
连接
断开
佩戴
取下
```

例如：

```text
pickup_object
```

并不关心具体拿的是什么。

底层逻辑可能是：

```text
手靠近对象
↓
产生空间接触
↓
对象跟随手移动
↓
持续超过阈值
↓
pickup_object
```

然后再将对象参数带进去：

```text
pickup_object(tool=torque_wrench)
```

---

# 七、第四级：复合事件

复合事件由多个原子事件或感知条件组合产生。

例如：

```text
pickup_torque_wrench
```

实际上等于：

```text
pickup_object
AND
object.type == torque_wrench
```

再例如：

```text
tighten_bolt_with_torque_wrench
```

可能由：

```text
person_holding_tool(torque_wrench)
AND
tool_contact_target(bolt)
AND
action_rotation
AND
duration >= 2s
```

组合形成。

这一层已经非常接近 SOP 能直接使用的能力。

---

# 八、Event Engine 的核心原则

整个 Event Engine 建议坚持五个原则：

### 1. 事件必须与 SOP 解耦

事件不知道：

> 自己属于第几步。

它只描述：

> 发生了什么。

---

### 2. 事件必须尽量跨 SOP 复用

例如：

```text
pickup_tool
```

应该是通用能力。

---

### 3. 事件必须包含时间属性

因为 AI-SOP 本质上是时序系统。

必须明确：

```text
什么时候开始
什么时候结束
持续多久
```

---

### 4. 事件允许“不确定”

输出不应只有：

```text
发生
未发生
```

还要支持：

```text
UNCERTAIN
```

---

### 5. 事件必须可追溯到证据

每一个关键事件最好都能找到：

```text
视频时间
摄像头
模型版本
判定依据
```

否则后期无法复核。

---

# 九、事件分类体系

一期建议定义以下一级事件类型：

```text
OBJECT_EVENT
ACTION_EVENT
RELATION_EVENT
REGION_EVENT
STATE_EVENT
SAFETY_EVENT
DEVICE_EVENT
SENSOR_EVENT
SPEECH_EVENT
MANUAL_EVENT
```

其中一期重点实现前六类中的视觉事件，加人工事件。

---

# 十、OBJECT_EVENT

对象事件回答：

> 画面中出现了什么。

例如：

```text
OBJECT_APPEAR
OBJECT_DISAPPEAR
OBJECT_DETECTED
OBJECT_MOVED
```

对象包括：

```text
工具
工件
防护用品
设备
零部件
```

示例：

```json
{
  "eventCode": "OBJECT_APPEAR",
  "objectType": "torque_wrench",
  "trackId": "tool_203"
}
```

---

# 十一、ACTION_EVENT

动作事件回答：

> 人或者对象做了什么。

一期建议先建设有限动作集合。

例如：

```text
pickup
put_down
insert
remove
push
pull
rotate
tighten
loosen
wear
remove_ppe
measure
connect
disconnect
```

动作库不要一开始就追求几百种。

应该从 PoC SOP 反推。

---

# 十二、RELATION_EVENT

关系事件非常重要。

很多机械实操并不是单纯识别动作，而是：

> 人 + 工具 + 工件之间的关系。

例如：

```text
PERSON_HOLDING_TOOL
TOOL_CONTACT_TARGET
HAND_TOUCH_OBJECT
OBJECT_ATTACHED_TO_OBJECT
```

示例：

```json
{
  "eventCode": "PERSON_HOLDING_TOOL",
  "person": "student_01",
  "tool": "torque_wrench",
  "confidence": 0.91
}
```

很多“动作识别”其实可以通过关系变化实现。

---

# 十三、REGION_EVENT

区域事件是低成本但非常有价值的一类能力。

例如：

```text
HAND_ENTER_REGION
PERSON_ENTER_REGION
OBJECT_ENTER_REGION
OBJECT_LEAVE_REGION
```

应用场景包括：

```text
从工具区取工具
将零件放回指定区域
手进入危险区域
工件进入检测区
```

例如：

```json
{
  "eventCode": "OBJECT_ENTER_REGION",
  "object": "torque_wrench",
  "region": "tool_zone_A"
}
```

---

# 十四、STATE_EVENT

状态事件回答：

> 某个对象当前处于什么状态。

例如：

```text
door_open
door_closed
bolt_installed
bolt_missing
switch_on
switch_off
part_aligned
part_not_aligned
```

状态识别通常比动作识别更容易成为稳定的评分依据。

因为最终操作结果有时比动作过程更可靠。

---

# 十五、SAFETY_EVENT

安全事件建议单独分类。

例如：

```text
PPE_MISSING
HAND_ENTER_DANGER_ZONE
UNSAFE_TOOL_USAGE
PERSON_TOO_CLOSE_TO_RUNNING_DEVICE
```

这样可以跨 SOP 做统一安全分析。

例如：

```json
{
  "eventCode": "PPE_MISSING",
  "ppeType": "safety_glasses",
  "severity": "HIGH"
}
```

---

# 十六、统一事件数据结构

建议平台定义统一 Event Schema。

一期可参考：

```json
{
  "eventId": "evt_20260918_000123",
  "eventType": "ACTION_EVENT",
  "eventCode": "pickup_tool",

  "source": {
    "sourceType": "CAMERA",
    "sourceId": "camera_01",
    "stationId": "station_03"
  },

  "operator": {
    "personId": "student_01"
  },

  "subject": {
    "type": "tool",
    "code": "torque_wrench",
    "trackId": "obj_302"
  },

  "target": null,

  "region": {
    "regionId": "tool_zone_A"
  },

  "time": {
    "start": "2026-09-18T10:32:15.221",
    "end": "2026-09-18T10:32:16.032",
    "durationMs": 811
  },

  "confidence": 0.94,

  "status": "CONFIRMED",

  "evidence": {
    "videoId": "video_20260918_03",
    "startMs": 123221,
    "endMs": 124032
  },

  "engine": {
    "eventVersion": "pickup_v1.3",
    "modelVersions": [
      "tool_detector_v4.1",
      "pose_v2.2"
    ]
  }
}
```

---

# 十七、事件状态

事件状态建议统一为：

```text
CANDIDATE
候选事件

CONFIRMED
确认事件

REJECTED
已否定

UNCERTAIN
无法确定
```

模型刚检测到：

```text
手接近扳手
```

不能马上产生 confirmed pickup。

应该先进入：

```text
CANDIDATE
```

继续观察若干帧。

如果对象跟随手移动：

```text
CONFIRMED
```

如果只是碰了一下：

```text
REJECTED
```

---

# 十八、事件必须是时间窗口概念

不能基于单帧直接判定大量动作。

比如：

```text
拿起螺丝刀
```

至少需要观察：

```text
t0
手靠近

t1
接触

t2
螺丝刀发生位移

t3
与手同步运动
```

所以 Event Engine 应围绕：

> Temporal Window

设计。

例如：

```text
过去2秒
过去5秒
当前动作窗口
```

而不是纯帧级处理。

---

# 十九、对象跟踪非常重要

如果只做目标检测，每一帧系统只知道：

```text
这里有一把扳手。
```

但不知道：

> 这一帧和上一帧是不是同一把扳手。

因此至少需要对象跟踪。

例如：

```text
torque_wrench
trackId = tool_203
```

这样系统才能判断：

```text
tool_203
原来在工具区
↓
被学生拿走
↓
进入装配区
↓
接触螺栓
↓
返回工具区
```

整个过程才可以被理解。

---

# 二十、人物跟踪

一期如果一个工位只有一个学生，可以简化。

但仍建议内部保持：

```text
personTrackId
```

未来支持：

```text
老师进入画面
另一名学生经过
双人协作
```

否则容易把其他人的动作归到当前学生。

---

# 二十一、对象身份与对象类别必须分开

例如画面有三把相同扳手。

类别：

```text
open_end_wrench
```

具体实例：

```text
tool_101
tool_102
tool_103
```

事件层必须支持：

> 类别级判断

和：

> 实例级跟踪

两种需求。

SOP通常关心类别：

> 使用扭矩扳手。

但视频追踪关心实例：

> 学生拿的是画面中的哪一把。

---

# 二十二、区域对象

ROI 不应该只是每个模型里的临时参数。

应该成为平台正式对象。

例如：

```json
{
  "regionId": "region_tool_A",
  "name": "工具区",
  "cameraId": "camera_01",
  "polygon": [
    [0.10, 0.15],
    [0.40, 0.15],
    [0.40, 0.60],
    [0.10, 0.60]
  ]
}
```

区域可以设置类别：

```text
TOOL_ZONE
WORK_ZONE
DANGER_ZONE
MATERIAL_ZONE
FINISHED_ZONE
CUSTOM
```

这样很多 Event 可以直接复用。

---

# 二十三、事件能力库是什么

AI Event Library 不等于模型库。

教师和 SOP Editor 使用的是：

> **事件能力库。**

例如：

```text
拿取扭矩扳手
放下扭矩扳手
佩戴防护镜
进入危险区域
紧固螺栓
插入连接线
```

每个能力背后可以组合多个模型。

例如：

```text
pickup_torque_wrench
```

底层依赖：

```text
person detector
tool detector
hand keypoints
object tracking
hand-object relation
temporal rule
```

但上层只看到：

> 拿取扭矩扳手。

---

# 二十四、事件能力库页面

AI Studio 中建议提供：

```text
事件能力库
```

列表字段：

| 字段         | 示例                   |
| ---------- | -------------------- |
| 能力名称       | 拿取扭矩扳手               |
| Event Code | pickup_torque_wrench |
| 类型         | 动作事件                 |
| 当前版本       | V1.3                 |
| 状态         | 已发布                  |
| Precision  | 95.8%                |
| Recall     | 93.1%                |
| 已引用 SOP    | 6                    |
| 负责人        | AI工程师A               |

---

# 二十五、事件能力详情

进入能力详情后分为：

```text
基本信息
定义
算法实现
数据集
测试结果
版本记录
部署范围
引用关系
```

---

# 二十六、能力定义

最重要的是先明确：

> 什么情况下算这个事件发生。

例如：

### 拿取扭矩扳手

定义：

```text
学生手部与扭矩扳手产生持续接触
且
扭矩扳手发生明显位移
且
工具与手保持同步运动至少0.5秒
```

反例：

```text
手从扳手上方经过
仅触碰但未拿起
另一人拿起扳手
```

必须把正例、反例写清楚。

否则算法团队和产品团队对“拿取”理解很容易不一致。

---

# 二十七、能力参数

有些 Event 不应该为每个对象重新开发。

例如通用：

```text
pickup_object
```

接受参数：

```text
objectType
region
minDuration
```

那么：

```text
拿取扭矩扳手
```

实际可以是：

```text
pickup_object(
  objectType=torque_wrench
)
```

拿取万用表：

```text
pickup_object(
  objectType=multimeter
)
```

这比创建：

```text
pickup_torque_wrench_model
pickup_multimeter_model
```

更有平台价值。

---

# 二十八、事件模板与具体能力

建议区分：

### Event Template

例如：

```text
pickup_object
object_enter_region
person_holding_object
```

### Event Capability

例如：

```text
pickup_torque_wrench
pickup_multimeter
torque_wrench_enter_assembly_zone
```

模板是规则能力。

具体能力是模板实例化后的可用能力。

---

# 二十九、对象能力库

除了事件库，还应有对象库。

例如：

```text
TOOL
├── torque_wrench
├── open_end_wrench
├── screwdriver
├── multimeter
└── caliper
```

每个对象包含：

```text
中文名称
英文/内部Code
类别
参考图片
模型支持情况
识别版本
适用摄像头
已应用场景
```

---

# 三十、对象新增流程

例如教师申请：

> 需要识别“塞尺”。

系统进入：

```text
AI能力需求
```

技术人员确认它属于：

```text
OBJECT
```

然后：

```text
创建对象定义
↓
采集图片/视频
↓
标注
↓
训练
↓
测试
↓
发布
↓
进入对象库
```

之后所有 SOP 都可以引用。

---

# 三十一、动作能力库

动作库最好采用“通用动作”而不是专业术语。

例如不要一开始设计：

```text
拆卸减速器端盖动作
```

而应尽量拆成：

```text
loosen
remove
lift
put_down
```

专业语义由 SOP 组合表达。

否则动作库很快会膨胀成几千个不可复用能力。

---

# 三十二、关系能力库

一期建议优先建设：

```text
person_near_object
person_holding_object
hand_touch_object
object_contact_object
object_inside_region
object_attached
```

关系能力往往比纯动作分类更稳定。

例如判断：

> 学生是否正在使用扭矩扳手。

可以组合：

```text
person_holding_object
+
tool = torque_wrench
```

而不一定单独训练“使用扭矩扳手”动作分类模型。

---

# 三十三、状态能力库

机械实训非常适合状态识别。

例如：

```text
bolt_present
bolt_absent
cover_installed
cover_removed
wire_connected
switch_on
tool_returned
```

有些 SOP 步骤最好使用：

```text
动作 + 最终状态
```

双重确认。

例如：

```text
检测到安装动作
AND
零件最终处于正确位置
```

比只看动作过程可靠。

---

# 三十四、一个步骤最好支持多证据融合

例如：

> 安装轴承。

判定可以是：

```text
EVENT:
insert_bearing

AND

STATE:
bearing_installed
```

如果只识别动作：

> 学生做了类似插入动作，

但轴承其实没有安装成功，就不应该判定步骤完成。

这也是后期提升可靠性的关键。

---

# 三十五、事件组合规则

复合 Event Engine 最低需要支持：

```text
AND
OR
SEQUENCE
WITHIN
DURATION
NOT
```

例如：

```text
person_holding(torque_wrench)
AND
tool_contact(bolt)
AND
rotation
```

或者：

```text
pickup_tool
SEQUENCE
tool_enter_work_zone
```

---

# 三十六、SEQUENCE 时序规则

例如：

```text
拿取扳手
↓
进入装配区
↓
紧固
↓
放回工具区
```

Event Engine 可以将多个原子事件组成：

```text
complete_wrench_operation
```

但这里需要谨慎。

如果这个组合明显属于某个具体 SOP，则应该留给 SOP Engine。

Event Engine 只组合具有通用意义的事件。

---

# 三十七、Event Engine 和 SOP Engine 的边界

这个边界必须非常明确。

### Event Engine 判断：

```text
拿了扳手
拧了螺栓
进入了危险区
```

### SOP Engine 判断：

```text
现在该不该拿扳手
这个螺栓是不是当前该操作的
进入危险区是否违反当前流程
```

Event Engine：

> 事实。

SOP Engine：

> 业务规则。

这两个不能混在一起。

---

# 三十八、置信度机制

每一个 Event 最好输出：

```text
confidence
```

但最终置信度不一定直接等于底层模型 confidence。

例如：

```text
对象检测 0.96
动作检测 0.91
跟踪稳定度 0.95
关系判断 0.89
```

最终 Event Confidence 可以通过算法综合得到。

一期不需要在产品层暴露计算公式。

但应该保留：

```text
event confidence
```

供 SOP Engine 和复核中心使用。

---

# 三十九、置信度分级

建议内部先采用三级：

```text
HIGH
MEDIUM
LOW
```

例如：

```text
HIGH >= 0.9
MEDIUM >= 0.7
LOW < 0.7
```

这里只是示例，具体阈值应由每个 Event 自己配置。

不能全平台统一使用 0.8。

不同能力的模型分布完全不同。

---

# 四十、事件判定策略

每个 Event Capability 应有：

```text
confirmThreshold
reviewThreshold
```

例如：

```text
confidence >= 0.90
→ CONFIRMED

0.65 <= confidence < 0.90
→ UNCERTAIN

confidence < 0.65
→ 不产生事件
```

这样避免：

> 低置信度结果强行进入 SOP。

---

# 四十一、反抖动机制

视觉系统经常发生：

```text
检测到
没检测到
检测到
没检测到
```

如果直接生成事件，会导致系统疯狂触发。

所以 Event Engine 必须有：

```text
debounce
```

例如：

> 连续存在 5 帧才认为对象存在。

或者：

> 连续消失 10 帧才认为对象离开。

这些属于 Event 实现参数，不应该让教师配置。

---

# 四十二、事件去重

例如学生持续拿着扳手 10 秒。

不能每帧产生：

```text
PERSON_HOLDING_TOOL
```

而应该产生一个区间事件：

```text
start
10:01:12

end
10:01:22
```

因此事件要支持：

```text
START
UPDATE
END
```

或者最终输出完整区间。

---

# 四十三、瞬时事件与持续事件

建议区分：

### Instant Event

例如：

```text
button_pressed
object_dropped
```

只有一个发生时间。

### Duration Event

例如：

```text
holding_tool
tightening
person_in_danger_zone
```

具有：

```text
start
end
duration
```

这一点对 SOP 超时和安全判断非常重要。

---

# 四十四、视频证据绑定

每一个 Confirmed 或 Uncertain 事件建议保存：

```text
cameraId
videoId
startTimestamp
endTimestamp
```

这样教师复核时可以直接播放。

例如：

```text
EVENT:
wrong_tool_use

发生时间：
02:12.4

视频：
02:08 - 02:18
```

不需要重新分析整段录像。

---

# 四十五、事件调试工具

AI Studio 应提供一个非常重要的工具：

> Event Debugger。

工程人员上传或选择一段视频。

左侧：

```text
视频
```

右侧实时展示：

```text
00:10.2 OBJECT_APPEAR torque_wrench
00:11.4 HAND_TOUCH torque_wrench
00:11.9 PICKUP torque_wrench
00:13.2 ENTER_REGION assembly_zone
00:15.4 TIGHTEN bolt_A
```

同时显示：

```text
confidence
model
rule
```

这个工具对调试 SOP 极其重要。

---

# 四十六、事件时间轴

Event Debugger 建议用时间轴展示：

```text
Person
──────────────

Tool
        [holding wrench────────────]

Action
               [tightening────]

Region
        [tool zone]
                   [assembly zone]
```

技术人员可以很直观看出：

> 为什么 SOP 没有触发。

---

# 四十七、事件测试集

每一个正式发布的 AI Event 都应该有测试集。

例如：

```text
pickup_torque_wrench
```

测试集至少包括：

```text
正确拿取
只碰一下
手从上方经过
拿取普通扳手
别人拿取
遮挡拿取
快速拿取
慢速拿取
```

这比只统计一堆随机视频上的 mAP 更贴近业务。

---

# 四十八、Event 级指标

除了模型指标：

```text
Precision
Recall
```

建议同时保存：

```text
True Positive
False Positive
False Negative
Average Delay
```

例如：

```text
Event:
pickup_torque_wrench

Precision:
95.2%

Recall:
92.8%

平均事件确认延迟：
0.43s
```

实时指导场景中：

> 延迟

也很重要。

---

# 四十九、事件延迟指标

训练模式下：

> 学生拿错工具。

如果 8 秒以后才提示：

> 工具错误。

产品体验基本不可用。

因此建议后续定义：

```text
Event Detection Latency
```

不同事件设置不同目标。

例如：

```text
安全事件：
<500ms

普通工具事件：
<1s

复杂时序动作：
<2s
```

一期可以先记录，不必严格承诺。

---

# 五十、AI Event 生命周期

一个 Event Capability 建议有：

```text
需求中
↓
数据准备
↓
开发中
↓
测试中
↓
待发布
↓
已发布
↓
已停用
```

SOP Editor 只能正式引用：

> 已发布。

测试中的能力可允许在验证环境使用。

---

# 五十一、新 AI 能力需求流程

教师在 SOP Editor 中点击：

> 申请新增 AI 能力。

进入需求：

```text
需求名称：
识别塞尺

来源：
发动机间隙测量SOP / S06

需求描述：
需要判断学生是否正确拿取塞尺

参考视频：
xxx.mp4

期望事件：
拿取塞尺
```

技术人员审核后判断：

```text
已有能力可复用
```

或者：

```text
需要新增对象
```

或者：

```text
需要新增动作能力
```

---

# 五十二、能力需求不能等于“训练新模型”

这是平台思路中非常重要的一点。

例如老师提出：

> 识别拿取塞尺。

技术团队首先应该判断：

```text
pickup_object
```

是否已有。

如果有：

只需要：

> 新增塞尺对象识别能力。

而不是重新训练：

> pickup_feeler_gauge 动作模型。

再例如：

> 将螺丝刀放入工具区。

可能只需要组合：

```text
object=screwdriver
+
OBJECT_ENTER_REGION
```

甚至完全不需要新训练动作模型。

---

# 五十三、AI 能力需求分析页

建议技术人员看到：

```text
业务需求：
学生拿取塞尺

拆解：

对象：
feeler_gauge
→ 当前不存在

动作：
pickup
→ 已存在

关系：
person_holding_object
→ 已存在

最终方案：
新增 feeler_gauge 对象模型能力
复用 pickup_object
```

这会不断促进能力复用。

---

# 五十四、数据采集管理

新增 AI 能力后，需要进入数据准备。

数据来源可包括：

```text
标准操作视频
学生历史训练视频
专门采集视频
```

一期建议技术后台能标记：

```text
数据属于哪个 Event
```

而不是所有视频都堆在一个目录。

---

# 五十五、正负样本

每个事件能力必须明确：

```text
正样本
负样本
```

例如：

### pickup_torque_wrench 正样本

```text
正确拿起扭矩扳手
```

### 负样本

```text
经过
触碰
拿其他工具
扳手被别人移动
学生将扳手推开
```

很多实际误判都来自缺乏“困难负样本”。

---

# 五十六、Hard Negative

系统以后应该专门积累：

> Hard Negative。

比如模型经常把：

```text
普通开口扳手
```

误识别为：

```text
扭矩扳手
```

这些视频应该进入：

```text
困难负样本
```

后续模型迭代优先加入训练集。

---

# 五十七、教师复核结果可以反哺 AI

这是未来非常重要的数据闭环。

例如 AI 判断：

```text
WRONG_TOOL
```

教师复核：

```text
AI误判
实际工具正确
```

这条记录应该进入：

```text
AI Correction Dataset
```

以后可以用于：

```text
模型评估
困难样本筛选
重新训练
```

但一期不需要自动训练。

先完成数据闭环。

---

# 五十八、事件反馈标签

教师复核可以生成：

```text
TRUE_POSITIVE
FALSE_POSITIVE
FALSE_NEGATIVE
```

例如系统没有检测到某一步，但教师确认实际发生：

```text
FALSE_NEGATIVE
```

这些都是模型优化最有价值的数据。

---

# 五十九、模型与事件必须多对多

不要设计成：

```text
一个Event
=
一个Model
```

正确关系应该是：

```text
Event
↔
Model
```

例如：

```text
pickup_tool
```

可能依赖：

```text
person detector
tool detector
pose model
tracker
relation model
```

同时：

```text
tool detector
```

又可以被几十个 Event 复用。

---

# 六十、模型版本管理

Event 应记录：

```text
当前生产环境依赖哪些模型版本
```

例如：

```text
pickup_torque_wrench V1.4

依赖：
tool_detector 4.2
pose_model 2.3
tracker 1.8
event_rule 1.4
```

这样模型升级后可以明确知道：

> 哪些 Event 会受到影响。

---

# 六十一、事件版本管理

Event Capability 本身也需要版本。

例如：

```text
pickup_torque_wrench V1.0
```

后来改变：

```text
确认时间
0.3s → 0.5s
```

或者增加：

```text
必须与手同步移动
```

应形成：

```text
V1.1
```

因为这可能影响 SOP 实际判断。

---

# 六十二、SOP 是否锁定 Event 版本

一期建议：

> 已发布 SOP Version 应锁定 Event Major Version。

至少不能让底层能力重大变化后，历史 SOP 行为完全不可追溯。

实际可采用：

```text
SOP V1.0
引用
pickup_torque_wrench 1.x
```

小修订可自动更新。

重大规则变化则需要重新验证 SOP。

---

# 六十三、能力升级影响分析

当技术人员准备发布：

```text
pickup_torque_wrench V2.0
```

系统应该显示：

```text
当前引用：

6个SOP
21个已发布版本
44个训练任务模板
```

并提示：

> 是否需要重新执行 SOP 验证。

这一块二期可以加强，但数据关系一期必须留好。

---

# 六十四、多摄像头事件

一期 PoC 可以主要使用单机位。

但 Event Engine 数据结构必须支持：

```text
sources:[]
```

例如一个事件可以由：

```text
camera_front
camera_top
```

共同确认。

比如：

```text
正面相机：
识别人体姿态

顶视相机：
识别工具和工件
```

最终合成：

```text
tighten_bolt
```

---

# 六十五、多机位时间同步

以后多摄像头必须考虑：

```text
timestamp alignment
```

否则：

```text
正面相机 10:01:12.1
顶视相机 10:01:12.8
```

很难联合判断。

一期可以先统一由边缘节点打时间戳。

后期再做更严格同步。

---

# 六十六、设备和传感器事件统一接入

未来接入 PLC 后：

```json
{
  "eventType": "DEVICE_EVENT",
  "eventCode": "motor_started",
  "sourceId": "plc_01",
  "timestamp": "..."
}
```

智能扭矩扳手：

```json
{
  "eventType": "SENSOR_EVENT",
  "eventCode": "torque_measurement",
  "value": 34.8,
  "unit": "Nm"
}
```

ASR：

```json
{
  "eventType": "SPEECH_EVENT",
  "eventCode": "spoken_phrase",
  "text": "确认设备断电"
}
```

SOP Engine 不需要关心：

> 数据是视觉还是 PLC 来的。

它只处理事件。

---

# 六十七、事件总线

从技术架构看，建议 Event Engine 最终对上层输出统一事件流。

概念上：

```text
Camera
AI Model
   ↓
Visual Event
      \
PLC → Device Event
       \
Sensor → Sensor Event
         \
ASR → Speech Event
           ↓
       Event Bus
           ↓
       SOP Engine
```

一期实现可以不真的上复杂 MQ。

但接口思想要一致。

---

# 六十八、实时和离线两种运行模式

Event Engine 应支持：

### Real-time

实训进行过程中实时产生 Event。

用于：

```text
训练提示
安全警告
实时进度
```

### Offline

训练结束以后重新跑视频。

用于：

```text
复核
算法升级后重新分析
问题排查
```

一期如果资源有限，可以优先实时。

但视频原始数据应该保留，给离线重算留口。

---

# 六十九、事件重算

未来模型升级后，技术人员可能需要：

> 用新模型重新分析某段历史视频。

系统应支持生成：

```text
Event Analysis Run
```

例如：

```text
Run A
使用旧模型

Run B
使用新模型
```

不要覆盖原始 Event。

否则历史考试结果会被无意改变。

---

# 七十、生产事件和实验事件隔离

AI工程师测试新模型时产生的事件不能进入正式成绩。

因此至少区分：

```text
PRODUCTION
VALIDATION
EXPERIMENT
```

SOP 正式任务只消费：

```text
PRODUCTION
```

事件流。

---

# 七十一、事件质量监控

AI后台应该逐步提供：

```text
事件触发次数
平均置信度
人工纠错率
False Positive率
False Negative反馈
```

例如：

```text
pickup_torque_wrench

过去30天：
触发 3,822 次
教师纠错 74 次
纠错率 1.94%
```

这比单纯离线测试指标更接近真实产品质量。

---

# 七十二、按场景监控效果

同一 AI 能力在不同学校可能表现完全不同。

例如：

```text
学校A
光线好
准确率高

学校B
摄像头位置低
遮挡严重
误判多
```

因此事件质量最好能按：

```text
学校
实训室
工位
摄像头
SOP
```

统计。

后期才能定位：

> 是模型问题还是部署问题。

---

# 七十三、摄像头健康状态也会影响 Event

如果摄像头：

```text
模糊
遮挡
曝光异常
偏移
离线
```

AI Event 结果会直接失真。

因此未来应该增加：

```text
Camera Health
```

但一期先支持：

```text
在线/离线
画面预览
```

即可。

---

# 七十四、AI Event 和业务异常不是一回事

例如：

```text
EVENT:
pickup_open_end_wrench
```

这只是事实。

如果当前步骤要求：

```text
torque_wrench
```

SOP Engine 才生成：

```text
WRONG_TOOL
```

所以：

> WRONG_TOOL 不是 AI Event。

它是：

> SOP异常。

这个概念一定要区分。

---

# 七十五、事件库和异常库必须分开

事件库：

```text
拿了什么
做了什么
去了哪里
状态如何
```

异常库：

```text
漏步
错序
错工具
超时
安全违规
```

前者是：

> 感知事实。

后者是：

> 业务判断。

---

# 七十六、Event Engine 一期最小能力集

如果我们按“机械零部件标准装配”做 PoC，一期其实不需要做很多能力。

建议先集中在：

### 对象

```text
person
hand
safety_glasses
gloves
part_A
bolt
torque_wrench
open_end_wrench
```

### 区域

```text
tool_zone
assembly_zone
finished_zone
```

### 基础事件

```text
object_appear
object_enter_region
object_leave_region
person_holding_object
pickup_object
put_down_object
tool_contact_target
tightening
```

### 状态

```text
part_installed
bolt_present
tool_returned
```

这已经足够完成第一套 PoC。

---

# 七十七、一开始不要建立巨大动作库

不要先做：

```text
100种动作
200种工具
500个零件
```

那会迅速把项目拖入数据采集和模型训练泥潭。

正确方式应该是：

```text
先确定PoC
↓
拆机器事件
↓
只建设PoC需要的能力
↓
做第二个SOP
↓
观察哪些能力可以复用
↓
再扩大事件库
```

事件能力库应该通过项目自然增长。

---

# 七十八、第一套和第二套 SOP 要刻意设计复用

比如第一套：

> 机械装配。

第二套最好不要完全一样，也不要完全不同。

可以选：

> 简单拆卸。

这样仍可以复用：

```text
扳手
螺栓
拿取
放置
紧固/松开
工具区
```

同时增加：

```text
remove_part
```

这样就能验证平台复用价值。

---

# 七十九、事件复用率应该成为平台核心指标

建议后期统计：

```text
新SOP所需Event总数：18

直接复用：12
参数化复用：4
新增开发：2
```

则：

```text
事件复用率
=
16 / 18
=
88.9%
```

这个指标非常重要。

随着项目越来越多，如果复用率越来越高，平台价值就在增加。

---

# 八十、新 SOP 接入成本指标

还建议统计：

```text
新增对象数量
新增动作数量
新增事件数量
新增训练数据
标注工时
算法开发工时
SOP配置工时
验证工时
总上线周期
```

第一套：

```text
40人日
```

第二套：

```text
22人日
```

第三套：

```text
12人日
```

如果能呈现这种下降趋势，说明平台化成功。

---

# 八十一、AI Event Engine 页面体系

一期 AI 后台建议至少包含：

```text
AI能力总览

事件能力库
对象能力库
区域管理
AI能力需求
视频样本
数据集
模型管理
事件调试器
模型部署
运行监控
```

其中最重要：

> 事件能力库 + Event Debugger。

---

# 八十二、事件能力总览

首页可以显示：

```text
已发布事件能力：23
测试中：6
需求中：4

对象能力：18
动作模板：9

被SOP引用：15项
本月新增复用能力：5
```

下面展示：

```text
最近异常率较高能力
最近新增需求
待验证能力
```

---

# 八十三、AI能力需求管理

列表：

```text
需求名称
来源SOP
来源步骤
需求类型
优先级
状态
负责人
```

状态：

```text
待分析
可复用
需要开发
开发中
测试中
已完成
不支持
```

这样产品和 AI 团队之间终于有完整闭环。

---

# 八十四、“不支持”也是合法结果

例如教师提出：

> 仅凭普通摄像头判断扭矩是否达到 35Nm。

技术团队应该可以明确：

```text
不建议视觉识别
```

推荐：

```text
智能扭矩扳手 / 传感器数据
```

产品不能为了“全AI视觉”硬做。

Event Engine 应允许能力实现方式是：

```text
VISUAL
SENSOR
DEVICE
SPEECH
MANUAL
FUSION
```

---

# 八十五、Event Capability 要标注推荐实现方式

例如：

```text
能力：
扭矩达到35Nm

推荐来源：
SENSOR

视觉支持：
不推荐
```

再例如：

```text
能力：
是否拿起扭矩扳手

推荐来源：
VISUAL
```

这样 SOP 配置时能够主动给实施人员提示。

---

# 八十六、多模态融合 Event

未来 Event 甚至可以直接是融合能力。

例如：

```text
correct_tightening
```

需要：

```text
Visual:
正在紧固

AND

Sensor:
torque >= 35Nm
```

最终输出：

```text
correct_tightening
```

但一期可以让 SOP Engine 组合两个 Event。

暂时不必把融合逻辑全部下沉。

---

# 八十七、一期 Event Engine 的技术实现边界

一期建议重点实现：

```text
对象检测
目标跟踪
人体/手部关键点
ROI关系
对象-手关系
简单动作时序
事件规则
事件输出
事件证据绑定
```

不建议一开始重点投入：

```text
通用视频大模型
复杂长视频理解
开放世界动作识别
任意自然语言动作定义
自动生成事件规则
```

前者更容易获得稳定结果。

---

# 八十八、Event Engine 最终输出不是“AI答案”

它本质上应该像一个：

> 实训场景的操作日志生成器。

输入：

```text
视频
设备
传感器
语音
```

输出：

```text
10:01:02 student entered station
10:01:08 safety_glasses detected
10:01:24 torque_wrench picked up
10:01:30 wrench entered assembly area
10:01:35 tightening started
10:01:39 tightening ended
10:01:44 wrench returned
```

SOP Engine 再根据这些日志理解：

> 操作对不对。

这种架构长期会比“直接让AI判断对错”更稳定、更可解释。

---

# 八十九、一期成功标准

AI Event Engine 一期不需要证明：

> 所有动作都能识别。

真正成功标准应该是：

第一，第一套 PoC 所需的关键事件能够稳定输出。

第二，每个事件可以绑定对应视频证据。

第三，SOP Engine 不依赖具体模型，只消费标准 Event。

第四，第二个 SOP 可以直接复用第一套部分 Event。

第五，AI 工程人员可以通过 Event Debugger 定位为什么某一步没有被正确触发。

第六，教师复核结果能够沉淀为 AI 优化数据。

---

# 九十、这一层最终形成的核心资产

AI Event Engine 长期真正积累的不是：

> 几十个 YOLO 模型。

而是一套不断扩展的：

```text
对象库
+
动作原子库
+
关系库
+
状态库
+
区域能力
+
事件模板
+
行业事件实例
+
困难样本数据
```

最终一个新 SOP 接入平台时，技术团队第一件事不再是：

> “这个项目我们需要训练什么模型？”

而应该变成：

> “这个 SOP 需要哪些事件？现有能力库已经覆盖多少？剩余缺口是什么？”

这说明产品真正从：

> AI项目开发

升级成：

> AI-SOP平台配置。

---

# 九十一、与 SOP Editor 的最终关系

最终整个核心链路应该非常清晰。

教师在 SOP Editor 中写：

```text
第7步：
使用扭矩扳手紧固A点螺栓
```

然后绑定：

```text
person_holding_tool(
  tool=torque_wrench
)

tightening(
  target=bolt_A
)
```

AI Event Engine 负责持续输出这些事实。

SOP Engine 负责判断：

```text
前置步骤是否完成
↓
事件是否发生
↓
事件是否满足时间和顺序要求
↓
步骤完成 / 异常
```

评分系统再负责：

```text
这个异常扣几分
```

视频系统负责：

```text
给老师展示证据
```

最终形成完整链条：

```text
Camera / Sensor
        ↓
AI Event Engine
        ↓
标准化事件
        ↓
SOP State Machine
        ↓
步骤与异常
        ↓
Assessment Engine
        ↓
训练提示 / 成绩 / 视频复盘 / 学情分析
```

这应该成为整套 AI-SOP 平台最核心的技术骨架。

---

# 九十二、一句话定义 AI Event Engine

> **AI Event Engine 的目标，不是让 AI 直接理解一整套职业技能 SOP，而是把真实操作世界持续翻译成稳定、结构化、可复用的机器事件，让上层 SOP 引擎能够像处理程序日志一样处理学生的实操过程。**

当这一层能够稳定工作之后，机械、机电、电气、汽修、轨交等不同专业之间真正可复用的底层能力才会逐渐形成。
