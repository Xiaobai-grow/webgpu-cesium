/**
 * @license
 * Portions of this file are derived from CesiumJS
 * https://github.com/CesiumGS/cesium
 * Copyright 2011-2026 Cesium JS Contributors
 * Licensed under the Apache License, Version 2.0
 *
 * TypeScript port for @webgpu-cesium/core
 */

import { defined } from "./defined"

/**
 * 双向链表节点。对标 Cesium `Core/DoublyLinkedList.js`。
 */
export class DoublyLinkedListNode<T> {
  item: T | undefined
  previous: DoublyLinkedListNode<T> | undefined
  next: DoublyLinkedListNode<T> | undefined

  constructor(item?: T, previous?: DoublyLinkedListNode<T>, next?: DoublyLinkedListNode<T>) {
    this.item = item
    this.previous = previous
    this.next = next
  }
}

function unlink<T>(list: DoublyLinkedList<T>, node: DoublyLinkedListNode<T>): void {
  if (defined(node.previous) && defined(node.next)) {
    node.previous.next = node.next
    node.next.previous = node.previous
  } else if (defined(node.previous)) {
    node.previous.next = undefined
    list.tail = node.previous
  } else if (defined(node.next)) {
    node.next.previous = undefined
    list.head = node.next
  } else {
    list.head = undefined
    list.tail = undefined
  }
  node.next = undefined
  node.previous = undefined
}

/**
 * 双向链表。对标 Cesium `Core/DoublyLinkedList.js`。
 */
export class DoublyLinkedList<T> {
  head: DoublyLinkedListNode<T> | undefined
  tail: DoublyLinkedListNode<T> | undefined
  private _length = 0

  get length(): number {
    return this._length
  }

  add(item?: T): DoublyLinkedListNode<T> {
    const node = new DoublyLinkedListNode(item, this.tail, undefined)
    if (defined(this.tail)) {
      this.tail.next = node
      this.tail = node
    } else {
      this.head = node
      this.tail = node
    }
    ++this._length
    return node
  }

  remove(node?: DoublyLinkedListNode<T>): void {
    if (!defined(node)) {
      return
    }
    unlink(this, node)
    --this._length
  }

  /**
   * 把 nextNode 挪到 node 之后。
   */
  splice(node: DoublyLinkedListNode<T>, nextNode: DoublyLinkedListNode<T>): void {
    if (node === nextNode) {
      return
    }
    unlink(this, nextNode)
    const oldNodeNext = node.next
    node.next = nextNode
    if (this.tail === node) {
      this.tail = nextNode
    } else if (defined(oldNodeNext)) {
      oldNodeNext.previous = nextNode
    }
    nextNode.next = oldNodeNext
    nextNode.previous = node
  }
}
