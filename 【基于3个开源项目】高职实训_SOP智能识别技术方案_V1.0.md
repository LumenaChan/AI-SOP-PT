# 高职院校实训操作智能识别与 SOP 比对系统技术方案

> 面向研发团队的工程实施与行动指南  
> 版本：V1.0  
> 日期：2026-09-17

---

## 1. 文档目的

本方案用于指导研发团队建设一套面向职业院校实训教学场景的“操作过程智能识别与 SOP 比对系统”。

系统目标不是单纯识别画面中出现了什么物体，而是通过摄像头持续采集学生实训过程，对学生当前正在执行的操作步骤进行实时识别，并与预先定义的标准操作流程（SOP）进行比对，持续记录每一步是否正确、是否遗漏、是否重复、是否顺序错误、是否超时，最终形成完整的实训过程记录与评价结果。

本方案综合参考以下三个开源项目的架构和实现思路：

1. NVIDIA SOP Monitoring Blueprints  
   https://github.com/NVIDIA/sop-monitoring-blueprints

2. Assembly Guidance System  
   https://github.com/vigneshuw/app-AssemblyGuidanceSystem

3. AI-SOP  
   https://github.com/MacTian/AI-SOP

三个项目分别代表了不同层次的实现路线：

- NVIDIA：工业级“动作时序分割 + VLM + DeepStream”完整训练与推理架构；
- Assembly Guidance System：动作识别、光流、目标检测与状态机组合的研究型方案；
- AI-SOP：YOLO、MediaPipe、LSTM、SOP 状态机、Web 管理与模型训练的一体化工程框架。

本方案不建议原封不动采用其中任一仓库，而建议将三者优势整合，形成适合职业教育实训场景的轻量级可落地架构。

---

# 2. 项目目标

## 2.1 核心业务目标

针对固定实训项目，例如：

- 机械装配；
- 电工接线；
- PLC 实训；
- 机电设备拆装；
- 汽车维修；
- 焊接操作；
- 数控设备操作；
- 检测与测量类实训；

由专业教师提前定义标准 SOP，学生在真实工位完成操作时，系统通过固定摄像头实时识别学生操作过程，并与标准 SOP 逐步比较。

系统最终至少应回答以下问题：

1. 学生当前正在执行哪个步骤；
2. 当前步骤是否符合标准 SOP；
3. 是否遗漏了某个步骤；
4. 是否提前执行了后续步骤；
5. 是否重复执行某一步骤；
6. 是否出现了未定义的异常动作；
7. 每个步骤持续了多长时间；
8. 整个实训任务是否完成；
9. 哪些步骤存在错误或风险；
10. 最终可以形成怎样的过程评价与成绩依据。

---

# 3. 一个必须明确的技术原则

## 3.1 SOP 不应由模型自行生成

标准 SOP 应由：

- 专业教师；
- 实训指导教师；
- 行业专家；
- 企业工艺人员；

根据教学标准、行业规范和设备操作规范进行定义。

标准 SOP 是系统的 Ground Truth。

例如：

```text
Step 01：检查设备是否断电
Step 02：打开设备防护罩
Step 03：使用扳手拆卸固定螺栓
Step 04：取下待检组件
Step 05：使用游标卡尺测量尺寸
Step 06：重新安装组件
Step 07：拧紧固定螺栓
Step 08：关闭防护罩
```

模型训练的目标不是“自己发现 SOP”，而是：

```text
给定视频片段
↓
判断该片段对应 Step 01~Step 08 中的哪一步
```

换句话说：

> SOP 是业务规则，模型负责识别，状态机负责判断。

---

# 4. 三类开源方案的技术定位

## 4.1 NVIDIA SOP Monitoring Blueprints

NVIDIA 方案的核心路线为：

```text
视频
↓
Temporal Action Segmentation
↓
动作片段
↓
Vision-Language Model
↓
动作理解
↓
SOP Compliance
```

主要特点：

- 支持动作起止时间标注；
- 使用 Temporal Action Detection / Segmentation；
- 使用 DDM-Net 做动作时序分割；
- 使用 Cosmos Reason 类 VLM 判断动作；
- 支持模型微调；
- 使用 DeepStream、Triton、vLLM 进行实时推理；
- 支持视频、RTSP、工业相机；
- 支持完整训练、推理、评估链路。

其最大的参考价值在于：

> 将“什么时候发生了一个完整动作”和“这个动作是什么”拆成两个问题。

对于长时间连续实训视频，这种架构是最合理的。

但 NVIDIA 方案训练资源要求高，官方方案涉及多块 A100 GPU、DeepStream、Triton、NIM、Cosmos Reason 等组件，因此不建议一期项目直接完整复制。

建议：

> 参考其架构思想，不直接照搬技术栈。

---

## 4.2 Assembly Guidance System

该项目的核心思想为：

```text
RGB 视频
+
Optical Flow
+
Object Detection
↓
Temporal Action Recognition
↓
State Machine
```

项目特点：

- 基于连续多帧进行动作识别；
- 计算光流捕捉运动变化；
- 同时结合目标检测结果；
- 使用滑动时间窗口；
- 使用 Majority Voting 平滑动作预测；
- 使用状态依赖关系判断步骤合法性；
- 可以识别跳步、重复步骤和顺序异常。

该项目对于本项目最重要的启示是：

> 不能只通过单帧目标检测判断学生操作步骤。

例如：

```text
当前画面：
手 + 扳手 + 螺栓
```

无法仅凭这一帧判断学生是在：

- 拿起扳手；
- 拧紧螺栓；
- 松开螺栓；
- 放下扳手。

必须观察一段连续时间内的视觉变化。

---

## 4.3 AI-SOP

AI-SOP 更接近可以直接二次开发的产品化框架。

已有能力包括：

- 摄像头视频流；
- YOLOv8；
- MediaPipe Hand Landmark；
- LSTM；
- SOP 状态机；
- SOP 模板；
- SOP 编辑；
- YOLO 标注；
- YOLO 模型训练；
- 实时告警；
- 实时 WebSocket；
- 历史操作记录；
- 截图；
- 统计分析；
- FastAPI；
- Vue 前端；
- Docker。

因此建议：

> 一期工程可以以 AI-SOP 的产品架构为参考或代码底座，但必须重新建设真正的“真实动作数据训练能力”。

特别需要注意：

AI-SOP 当前 LSTM 示例训练主要使用 synthetic data，不能直接视为已经具备真实实训动作训练能力。

---

# 5. 推荐总体技术架构

推荐将系统分为五层。

```text
┌─────────────────────────────┐
│        业务与教学层           │
│ SOP定义 / 项目管理 / 考核规则 │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│        SOP状态机层            │
│ 顺序 / 分支 / 跳步 / 重复 / 超时 │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│        动作识别层             │
│ Temporal Action Recognition │
│ LSTM / TCN / Video Model    │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│        视觉感知层             │
│ YOLO / Hand Pose / ROI      │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│        视频采集层             │
│ USB / RTSP / 工业相机        │
└─────────────────────────────┘
```

五层职责必须解耦。

---

# 6. 视觉感知层设计

## 6.1 YOLO 的职责

YOLO 不负责直接判断完整 SOP。

YOLO 主要负责识别：

- 工具；
- 零部件；
- 工件；
- 设备部件；
- 材料；
- 仪表；
- 关键区域；
- 安全防护用品。

例如机械装配场景可以训练：

```text
wrench
screwdriver
bolt
nut
bearing
shaft
cover
caliper
glove
component_A
component_B
```

YOLO 输出：

```json
{
  "class": "wrench",
  "confidence": 0.93,
  "bbox": [x1, y1, x2, y2]
}
```

---

## 6.2 不建议直接依赖 COCO 类别

实训场景中的工具、零件、设备部件往往不在通用 YOLO 模型类别中。

因此必须建设：

> 专属 YOLO Dataset。

需要支持：

- 图片抽帧；
- Bounding Box；
- Polygon；
- 类别管理；
- 数据集版本；
- 训练；
- 验证；
- 模型版本管理。

AI-SOP 的 YOLO 数据标注和训练模块可直接作为重要参考。

---

# 7. 手部姿态识别

部分实训步骤仅靠物体不足以判断。

例如：

```text
拿住螺母
旋转螺母
调整扳手
按压按钮
插入接线端子
```

建议增加：

```text
MediaPipe Hand Landmark
```

每只手获取 21 个关键点。

可以形成：

```text
Left Hand：21 × 3
Right Hand：21 × 3
```

用于辅助判断：

- 手是否接触目标；
- 手移动方向；
- 旋转行为；
- 双手配合关系；
- 手与工具的相对位置。

---

# 8. 动作识别层

这是整个系统最核心的 AI 部分。

## 8.1 输入必须是时间序列

不能使用：

```text
单帧 → Step
```

应采用：

```text
Frame t-n
Frame t-n+1
...
Frame t
↓
Action
```

例如以 25 FPS 摄像头为例：

可以每秒采样 5~10 帧。

使用：

```text
16帧
32帧
48帧
```

形成多尺度时间窗口。

参考 AI-SOP 的 Multi-scale Window Voting 思路。

---

## 8.2 一期建议模型路线

推荐：

```text
YOLO Feature
+
Hand Pose Feature
+
RGB / Motion Feature
↓
Feature Fusion
↓
LSTM / TCN
↓
Action Class
```

动作类别即：

```text
Step01
Step02
Step03
...
Other
```

例如：

```text
Feature =
[
  YOLO object presence,
  object confidence,
  bbox position,
  object relationship,
  hand landmarks,
  hand-object distance,
  optical flow,
  optional CNN feature
]
```

---

# 9. Optical Flow

参考 Assembly Guidance System，可以增加光流。

光流主要用于描述：

> 相邻帧之间像素运动方向与速度。

可以很好地区分：

- 静止；
- 平移；
- 旋转；
- 快速操作；
- 手部移动。

推荐一期先采用：

```text
Farneback Optical Flow
```

优点：

- OpenCV 原生支持；
- 不需要额外训练；
- 计算开销可控；
- 工业固定机位下效果较稳定。

后续如果需要，可以再升级到：

- RAFT；
- GMFlow；
- Video Transformer。

---

# 10. Other / Unknown 类必须存在

动作分类模型绝对不能只有：

```text
Step01
Step02
Step03
...
Step08
```

必须增加：

```text
Other
```

否则任何模型无法识别的动作都会被强制归类到某个合法步骤。

Other 用于：

- 非 SOP 动作；
- 学生走动；
- 遮挡；
- 拿错工具；
- 暂停；
- 无意义动作；
- 未知操作。

这是防止系统产生“强行识别”的关键设计。

---

# 11. SOP 状态机设计

模型只回答：

> 当前动作最像 Step03。

但是否允许执行 Step03，由状态机判断。

---

## 11.1 基础状态

每一步至少包含：

```text
PENDING
ACTIVE
COMPLETED
SKIPPED
TIMEOUT
ERROR
```

---

## 11.2 状态关系

每一步定义：

```json
{
  "step_id": "step_03",
  "name": "拆卸固定螺栓",
  "allowed_previous": ["step_02"],
  "allowed_next": ["step_04"],
  "timeout": 60,
  "required": true
}
```

---

## 11.3 必须支持的异常类型

### 正常

```text
1 → 2 → 3 → 4
```

### 跳步

```text
1 → 2 → 4
```

判定：

```text
Step03 = SKIPPED
```

### 顺序错误

```text
1 → 3 → 2
```

产生：

```text
Sequence Break
```

### 重复

```text
1 → 2 → 2 → 3
```

产生：

```text
Repeated Step
```

### 超时

```text
Step03 > 60s
```

产生：

```text
TIMEOUT
```

### Unknown

连续一定时间：

```text
Other
```

产生：

```text
Unknown Action
```

---

# 12. 防抖机制

不能模型预测一次 Step03 就立即认定步骤完成。

必须采用连续命中机制。

例如：

```text
连续 5 次预测 Step03
且平均 confidence > 0.8
↓
确认 Step03
```

类似 AI-SOP 的：

```text
confirm_frames
```

推荐结构：

```json
{
  "step_id": "step_03",
  "confirm_frames": 5,
  "min_confidence": 0.8
}
```

---

# 13. Majority Voting

推荐保存最近 N 次模型输出：

```text
Step02
Step02
Step03
Step02
Step02
```

最终输出：

```text
Step02
```

减少模型跳动。

窗口示例：

```text
N = 10
```

也可以计算：

```text
Top-1
Top-2
Top-3
```

供前端展示和调试。

---

# 14. SOP 数据结构建议

```yaml
sop_id: mechanical_assembly_001

name: 轴承拆装实训

steps:

  - step_id: step_01
    name: 检查设备断电
    order: 1
    required: true
    timeout: 30
    confirm_frames: 5
    allowed_previous: []
    allowed_next:
      - step_02

  - step_id: step_02
    name: 打开防护罩
    order: 2
    required: true
    timeout: 30
    confirm_frames: 5
    allowed_previous:
      - step_01
    allowed_next:
      - step_03
```

后续支持：

- 分支；
- 可选步骤；
- 并行步骤；
- 循环步骤。

---

# 15. 数据采集方案

模型效果的关键不是选什么模型，而是：

> 数据质量。

---

## 15.1 固定采集环境

建议每个实训项目固定：

- 摄像头型号；
- 摄像头位置；
- 摄像头高度；
- 摄像头角度；
- 分辨率；
- 帧率；
- 光照；
- 工位布局。

一期尽量避免：

```text
任意摄像头
任意角度
任意环境
```

这样会大幅增加模型泛化难度。

---

## 15.2 每个 SOP 的视频数量

一期 POC：

建议：

```text
10~20 人
×
每人 5~10 次
```

即：

```text
50~200 条完整 SOP 视频
```

更正式的数据集：

建议至少：

```text
300~1000 条
```

但实际数量应根据：

- SOP 步骤数量；
- 操作差异；
- 动作相似度；
- 环境复杂度；

决定。

---

# 16. 必须采集错误样本

只训练正确操作是不够的。

必须人为录制：

```text
正确流程
跳步骤
步骤顺序错误
重复步骤
拿错工具
操作中断
停顿
半途返回
遮挡
非 SOP 动作
```

这样 Other 和异常识别才会可靠。

---

# 17. 数据标注

每条完整视频需要标：

```text
00:00:03 ~ 00:00:07 Step01
00:00:08 ~ 00:00:15 Step02
00:00:16 ~ 00:00:28 Step03
...
```

推荐标注格式：

```json
{
  "video": "student_001_001.mp4",
  "actions": [
    {
      "step_id": "step_01",
      "start": 3.2,
      "end": 7.5
    },
    {
      "step_id": "step_02",
      "start": 8.0,
      "end": 15.2
    }
  ]
}
```

这与 NVIDIA SOP Training Blueprint 的动作时间段标注思路一致。

---

# 18. 两类标注应分开

系统需要两套数据标注：

## 18.1 Object Dataset

用于 YOLO：

```text
Image
↓
BBox / Polygon
↓
Object Class
```

例如：

```text
wrench
bolt
bearing
caliper
```

---

## 18.2 Action Dataset

用于动作识别：

```text
Video Segment
↓
Action Label
```

例如：

```text
step_01
step_02
step_03
other
```

两种数据集不能混为一谈。

---

# 19. 模型训练 Pipeline

建议建设标准训练流水线。

```text
视频上传
↓
视频抽帧
↓
目标标注
↓
YOLO训练
↓
动作时间段标注
↓
Feature Extraction
↓
Sequence Dataset
↓
LSTM / TCN Training
↓
Validation
↓
Model Evaluation
↓
Model Registry
↓
Deploy
```

---

# 20. Feature Extraction

对于每个时间点，可以生成：

```text
YOLO：
object class
confidence
bbox
center
area

Hand：
21 landmarks × 2

Motion：
optical flow magnitude
optical flow direction

Optional：
CNN feature
```

最终形成：

```text
frame_feature_vector
```

然后：

```text
T × Feature
```

输入时序模型。

---

# 21. 模型选择建议

## 一期推荐

优先：

```text
LSTM
```

或：

```text
TCN
```

原因：

- 训练成本低；
- 推理快；
- 易调试；
- 数据需求相对小；
- 对固定机位工业动作非常实用。

---

## 二期可升级

如果 LSTM 效果不足，再考虑：

```text
SlowFast
X3D
VideoMAE
TimeSformer
Video Swin Transformer
```

---

## 三期才考虑 VLM

如果需要：

- 大量不同实训项目；
- SOP 经常变化；
- 模型希望具备更强泛化；
- 需要自然语言理解操作；

再考虑：

```text
Video VLM
```

参考 NVIDIA：

```text
Temporal Segmentation
+
Cosmos Reason
```

但不建议一期就上。

---

# 22. Temporal Segmentation

当完整实训时间较长，例如：

```text
10~30 分钟
```

直接使用固定滑动窗口分类可能存在步骤边界问题。

后续可以增加：

```text
Temporal Action Segmentation
```

专门检测：

```text
动作开始
动作结束
```

再对动作片段进行分类。

可以参考 NVIDIA 的：

```text
DDM-Net
```

一期可以暂不引入。

---

# 23. 实时推理 Pipeline

建议：

```text
Camera
↓
Frame Capture
↓
Resize / ROI
↓
YOLO
↓
Hand Landmark
↓
Optical Flow
↓
Feature Fusion
↓
Temporal Buffer
↓
Action Model
↓
Majority Voting
↓
SOP State Machine
↓
Event
↓
WebSocket
↓
Frontend
```

---

# 24. 实时推理频率

不建议每一帧都跑完整模型。

例如摄像头：

```text
30 FPS
```

可以：

```text
Camera Capture：30 FPS

YOLO：
5~10 FPS

Action Model：
2~5 次 / 秒
```

这样可以明显降低 GPU 负载。

---

# 25. ROI 机制

对于固定工位，应支持：

```text
Region Of Interest
```

只分析：

```text
实训操作区域
```

忽略：

- 背景；
- 其他学生；
- 教师；
- 走动人员。

这对提升识别精度非常重要。

---

# 26. 多摄像头

一期建议：

> 一个工位一个主摄像头。

复杂实训可以扩展：

```text
Camera A：正面
Camera B：顶部
Camera C：侧面
```

然后进行：

```text
Multi-view Feature Fusion
```

但一期不要优先增加复杂度。

---

# 27. 后端架构

推荐：

```text
Python
FastAPI
```

服务拆分：

```text
camera service
inference service
sop service
training service
dataset service
model service
record service
evaluation service
```

---

# 28. 推荐目录结构

```text
backend/

  camera/
    capture.py
    multi_camera.py
    preprocessing.py

  detection/
    yolo_detector.py
    hand_detector.py

  action/
    feature_extractor.py
    optical_flow.py
    sequence_buffer.py
    lstm_model.py
    tcn_model.py
    action_inference.py

  sop/
    schema.py
    state_machine.py
    validator.py

  training/
    dataset.py
    yolo_training.py
    action_training.py

  models/
    registry.py

  api/
    camera.py
    inference.py
    sop.py
    dataset.py
    training.py
    records.py
```

---

# 29. 前端建议

一期页面至少包括：

## 实时监控

展示：

```text
摄像头
当前步骤
当前置信度
Top3 Action
SOP进度
异常信息
```

---

## SOP 管理

支持：

```text
新增 SOP
编辑 SOP
步骤排序
步骤依赖
超时
允许分支
关键对象
```

---

## 数据标注

包括：

```text
图片标注
视频步骤标注
```

---

## 模型训练

展示：

```text
Dataset
Epoch
Loss
Accuracy
mAP
Validation Accuracy
```

---

## 操作记录

保存：

```text
学生
项目
开始时间
结束时间
步骤
识别时间
置信度
错误
截图
```

---

# 30. 建议数据库实体

至少包括：

```text
User
Student
TrainingProject
SopDefinition
SopStep
Dataset
DatasetVersion
Video
ActionAnnotation
ObjectAnnotation
Model
ModelVersion
TrainingTask
PracticeSession
StepRecord
ErrorEvent
Screenshot
```

---

# 31. 训练评估指标

不能只看：

```text
Accuracy
```

至少需要：

```text
Precision
Recall
F1
Confusion Matrix
```

重点关注：

```text
Step02 是否经常被识别成 Step03
```

---

# 32. SOP 级指标

系统最终需要评价完整流程。

例如：

```text
Step Recognition Accuracy

Sequence Accuracy

Skip Detection Accuracy

Repeat Detection Accuracy

Timeout Detection Accuracy

Unknown Detection Accuracy
```

---

# 33. 最重要的指标

推荐最终使用：

```text
Sequence Accuracy
```

即：

> 一整套 SOP 是否被正确识别。

例如真实：

```text
1 → 2 → 3 → 4 → 5
```

预测：

```text
1 → 2 → 3 → 4 → 5
```

才算完整正确。

因为单步 Accuracy 很高，并不代表整个实训过程可靠。

---

# 34. 性能指标

实时系统建议：

```text
Action latency < 1s
```

最好：

```text
300~800ms
```

对职业院校实训监控一般已经足够。

无需追求：

```text
20ms
```

级别的工业机器人控制实时性。

---

# 35. 推荐硬件

一期开发：

```text
RTX 4070 / 4080 / 4090
```

即可满足：

- YOLO；
- MediaPipe；
- LSTM；
- 多路摄像头实验。

实际教室部署可以考虑：

```text
RTX 4060 / 4070
```

或 NVIDIA Jetson 系列。

---

# 36. 部署架构

推荐：

```text
Camera
↓
Edge Inference
↓
School LAN
↓
Server
↓
Training Management Platform
```

视频最好：

> 本地推理。

不要所有视频都上传中央服务器后推理，否则：

- 带宽高；
- 延迟高；
- 多工位扩展困难。

---

# 37. 与三个开源项目的具体复用建议

## AI-SOP

优先参考或复用：

```text
FastAPI
Vue
YOLO training
YOLO labeling
Camera
WebSocket
SOP manager
State machine
Alert
History
Docker
```

必须重写：

```text
真实动作训练
真实 Action Dataset
Feature Extraction Pipeline
模型评估
```

---

## Assembly Guidance System

重点参考：

```text
Optical Flow
Temporal Window
Action Localization
Majority Voting
State Dependencies
Sequence Break
Repeated Step
```

不建议直接复用整体 UI 与工程结构。

---

## NVIDIA SOP Monitoring

重点参考：

```text
Action Annotation
Temporal Segmentation
Training / Evaluation 分离
Model Pipeline
Video → Action Chunk → Recognition
```

二期以后可以参考：

```text
DDM
VLM
DeepStream
Triton
```

---

# 38. 一期 MVP 范围建议

为了降低风险，一期只选：

```text
1 个专业
1 个实训项目
1 套 SOP
5~10 个步骤
1 个摄像头
```

要求：

```text
固定工位
固定相机
固定光照
无遮挡
```

一期目标不是“通用 AI 实训系统”。

而是：

> 把一个真实实训项目做透。

---

# 39. MVP 验证目标

建议验收：

```text
单步识别准确率 ≥ 90%

核心步骤 ≥ 95%

Sequence Accuracy ≥ 85%

跳步识别 ≥ 90%

重复步骤识别 ≥ 90%

推理延迟 ≤ 1 秒
```

以上数值应根据真实项目难度调整。

---

# 40. 实施阶段

## Phase 0：业务建模

研发前必须完成：

```text
实训项目
标准 SOP
步骤定义
步骤依赖
步骤允许分支
关键工具
关键部件
错误类型
```

---

## Phase 1：数据采集

完成：

```text
摄像头方案
工位固定
视频采集
正确样本
错误样本
```

---

## Phase 2：YOLO

完成：

```text
Object Class
Dataset
Annotation
Training
Evaluation
```

---

## Phase 3：Action Recognition

完成：

```text
Action Dataset
Feature Extraction
LSTM / TCN
Training
Evaluation
```

---

## Phase 4：SOP Engine

完成：

```text
State
Dependency
Skip
Repeat
Timeout
Other
```

---

## Phase 5：实时系统

完成：

```text
Camera
Inference
State Machine
WebSocket
Frontend
Record
```

---

## Phase 6：现场验证

至少：

```text
20~50 名学生
```

进行真实实训测试。

收集：

```text
误识别
漏识别
环境变化
动作差异
```

进入第二轮训练。

---

# 41. 研发团队近期行动清单

第一周建议完成：

1. Fork / 本地运行 AI-SOP；
2. 完整跑通摄像头；
3. 跑通 YOLO inference；
4. 跑通 SOP State Machine；
5. 阅读 Assembly Guidance System 的：
   - inference_machine.py；
   - state_machine.py；
6. 阅读 NVIDIA：
   - sop-training-bp；
   - sop-inference-bp；
7. 确定第一个实训项目；
8. 教师输出正式 SOP。

第二阶段：

1. 定义 Object Classes；
2. 定义 Action Classes；
3. 采集第一批视频；
4. 建立标注规范；
5. 建立 Dataset V1；
6. YOLO 训练；
7. 建立 Action Dataset。

第三阶段：

1. 实现 FeatureExtractor；
2. 实现 SequenceBuffer；
3. 实现 LSTM / TCN；
4. 实现 Majority Voting；
5. 接入状态机；
6. 联调实时视频。

---

# 42. 技术风险

## 风险一：动作非常相似

例如：

```text
拧紧螺栓
松开螺栓
```

YOLO 对象完全一样。

解决：

```text
Optical Flow
Hand Trajectory
Temporal Model
```

---

## 风险二：手遮挡零件

解决：

```text
Camera Angle
Top Camera
Temporal Context
```

---

## 风险三：学生动作差异大

解决：

```text
多学生数据
数据增强
Hard Sample Mining
```

---

## 风险四：模型在实验室准确，换工位失效

解决：

```text
固定相机规范
统一背景
统一ROI
Domain Augmentation
```

---

## 风险五：只采正确数据

结果：

模型对异常动作没有识别能力。

必须：

```text
主动设计错误样本
```

---

# 43. 不建议一期做的能力

以下能力建议暂缓：

```text
通用 VLM
自动生成 SOP
自动理解任意新实训项目
多摄像头融合
3D Pose
全校所有专业统一模型
云端大模型实时理解视频
```

这些能力会显著扩大项目风险。

---

# 44. 推荐一期最终技术栈

```text
Frontend:
Vue 3
ECharts

Backend:
Python
FastAPI
WebSocket

CV:
OpenCV
Ultralytics YOLO

Hand:
MediaPipe

Action:
PyTorch
LSTM / TCN

Motion:
Optical Flow

Database:
PostgreSQL

Cache:
Redis（可选）

Deployment:
Docker
NVIDIA CUDA
```

---

# 45. 最终推荐技术路线

建议最终采用：

```text
教师定义 SOP
        ↓
标准步骤
        ↓
采集多人标准 / 异常视频
        ↓
Object Annotation
        ↓
YOLO
        ↓
Action Annotation
        ↓
Feature Extraction
        ↓
YOLO Feature
+
Hand Pose
+
Optical Flow
        ↓
LSTM / TCN
        ↓
Current Action
        ↓
Majority Voting
        ↓
SOP State Machine
        ↓
正常 / 跳步 / 重复 / 错序 / 超时
        ↓
完整过程记录
        ↓
实训评价
```

---

# 46. 后续升级路线

如果一期数据和系统跑通后，后续可以按以下方向逐步升级。

## V2

增加：

```text
TCN / VideoMAE
```

提高复杂动作识别。

---

## V3

增加：

```text
Temporal Segmentation
```

解决长视频动作边界。

可以参考：

```text
DDM-Net
```

---

## V4

增加：

```text
VLM
```

实现：

```text
Action Semantic Reasoning
```

参考 NVIDIA Cosmos Reason。

---

## V5

形成：

```text
通用实训视觉理解平台
```

支持不同专业通过：

```text
SOP + Dataset + Model
```

动态配置新项目。

---

# 47. 结论

本项目技术上可行，但不能简单理解为：

```text
YOLO + 摄像头 = SOP识别
```

更准确的系统结构应当是：

```text
Object Detection
+
Hand Pose
+
Motion
+
Temporal Action Recognition
+
SOP State Machine
```

三个参考仓库各自提供了重要能力：

```text
AI-SOP
→ 产品工程底座

Assembly Guidance System
→ 时序动作识别与状态机思想

NVIDIA SOP Monitoring
→ 工业级完整训练与推理架构
```

一期最合理策略为：

> 以 AI-SOP 的系统工程结构为基础，吸收 Assembly Guidance System 的时序动作识别与状态机设计，参考 NVIDIA 的数据标注、动作分段、训练评估架构，先实现固定场景、固定工位、固定 SOP 的高准确率识别。

不要一开始追求：

```text
任意专业
任意动作
任意摄像头
任意环境
```

应先将一个实训项目做成真正可用的闭环：

```text
数据采集
→ 标注
→ 训练
→ 推理
→ SOP判断
→ 结果记录
→ 教学评价
```

只要这一闭环跑通，后续增加新的专业和实训项目，本质上就是持续增加：

```text
SOP
+
Dataset
+
Model
```

这才是整个项目长期可扩展的核心架构。
