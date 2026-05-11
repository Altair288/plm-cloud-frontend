这是一份针对 Java 23 环境下 Service 层重构的 Agent Skills 规范文档。它将研究报告中的核心架构思想转化为可操作的工程指令、工作流和代码范式。

---

# Agent Skill: java23-service-refactoring

## 元数据 (Metadata)

- **ID**: `java23-service-refactoring`
- **版本**: 1.0.0
- **适用环境**: JDK 23+, Spring Boot 3.x+

## 描述 (Description)

当用户请求优化、重构或审查包含复杂业务逻辑（如大量 `if-else` 分支、嵌套 `for` 循环或树形结构处理）的 Java Service 层代码时加载此技能。本规范指导如何利用 Java 23 的数据导向编程 (DOP)、流收集器 (Stream Gatherers) 及模式匹配特性实现高内聚、低复杂度的现代逻辑处理。

---

## 指令与工作流 (Instructions & Workflow)

### 1. 认知复杂度评估 (Cognitive Complexity Assessment)

在进行任何修改前，识别以下“技术债务”信号：

- **末日箭头 (Arrow of Doom)**：缩进超过 3 层的嵌套结构 。

- **类型安全性缺失**：在 `if` 块中手动进行强制类型转换。
- **非穷举性判断**：使用 `if-else` 处理有限的状态集，缺乏编译期检查 。

- **低效数据处理**：在循环中使用嵌套搜索构建层级结构（$O(n^2)$） 。

### 2. 重构执行路径 (Refactoring Path)

1. **应用卫语句 (Guard Clauses)**：首先提取所有边缘情况和错误检查，通过立即返回实现逻辑扁平化 。

2. **数据建模**：将状态分支转换为 `sealed interface` 与 `record` 的组合，利用代数数据类型 (ADT) 明确逻辑边界。
3. **模式匹配转换**：将 `if-else` 链条转换为 Java 23 的增强型 `switch` 表达式（支持原始类型和模式匹配） 。

4. **流式重构**：将命令式循环转换为函数式流。针对复杂状态逻辑，使用 Java 23 的 `Stream Gatherers` (如 `windowFixed`, `fold`) 。

5. **校验逻辑前置**：将参数校验移至 DTO 层，利用 Bean Validation 注解配合 `@Validated` 触发，保持 Service 方法纯粹性 。

---

## 技术模式规范 (Technical Patterns)

### A. 增强型 Switch 与模式匹配 [JEP 455]

- **规则**：优先使用 `switch` 表达式而非 `if-else` 链。
- **Java 23 特性**：利用原始类型模式匹配。
- **示例**：

```java
// 推荐：支持原始类型匹配与 when 子句
String rating = switch (score) {
    case int i when i >= 90 -> "A";
    case int i when i >= 60 -> "B";
    case int i -> "C";
}; [9, 15]

```

### B. 数据导向编程 (DOP)

- **核心思想**：数据（Records）与逻辑（Pattern Matching）分离。
- **代码规范**：

```java
public sealed interface Command permits Create, Update, Delete {}
public record Create(String name) implements Command {}

// 处理逻辑
public void handle(Command cmd) {
    switch (cmd) {
        case Create(var name) ->... // 自动解构
        case Update u ->...
        case Delete d ->...
    } // 编译器自动检查穷举性
}

```

### C. 高效树形构建 ($O(n)$ 模式)

- **规范**：禁止嵌套循环查询。统一采用 Map 辅助的一阶段或二阶段构建。
- **实现建议**：

```java
Map<Long, Node> nodeMap = list.stream()
   .collect(Collectors.toMap(Node::getId, n -> n)); [16, 17, 18]

list.forEach(node -> {
    if (node.getParentId()!= null) {
        Node parent = nodeMap.get(node.getParentId());
        if (parent!= null) parent.getChildren().add(node);
    }
});

```

### D. 流收集器 (Stream Gatherers) [JEP 473]

- **应用场景**：分批处理、滑动窗口、有状态转换。
- **内置操作**：
- `windowFixed(size)`：固定大小分批 。

- `mapConcurrent(max)`：虚拟线程并行映射 。

---

## 质量核对清单 (Review Checklist)

1. **逻辑层级**：方法内部最深缩进是否控制在 2 层以内？
2. **类型转换**：是否还存在 `(Type) obj` 这种手动强转？（应使用模式匹配变量绑定声明）
3. **状态完整性**：对于枚举或密封类的处理，`switch` 是否实现了穷举（即不需要或仅使用有意义的 `default`）？
4. **校验职责**：Service 方法开头是否充满了 `if (arg == null)`？（应迁移至 `@NotNull` 或 Validator 机制）
5. **性能陷阱**：处理层级数据时，是否存在复杂度为 $O(n^2)$ 的双重循环？

6. **资源利用**：对于耗时 I/O 任务，是否考虑了 Java 23 增强的 `mapConcurrent` 配合虚拟线程？

---

注：本规范基于 JDK 23。部分功能（如原始类型模式匹配、Gatherers）目前可能处于预览阶段，需开启 `--enable-preview` 。
