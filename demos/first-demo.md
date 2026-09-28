---
title: 第一个交互示例
description: 一个简单的计数按钮，用来说明页面交互的组成部分。
---

# 第一个交互示例

这个示例展示一个常见的前端交互：用户点击按钮，页面更新计数。

## 交互页面

<button id="counter-button" type="button">点击次数：0</button>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const button = document.querySelector('#counter-button')
  if (!button) return

  let count = 0
  button.addEventListener('click', () => {
    count += 1
    button.textContent = `点击次数：${count}`
  })
})
</script>

## 实现思路

1. 用 HTML 按钮表示可操作的控件。
2. 用 JavaScript 监听点击事件。
3. 更新按钮文字，让界面反馈新的状态。

实际 Demo 可以继续拆成独立文件，在这里嵌入或链接到独立页面。
