import { Operation } from "@/coverage/openApi/operation";
import { Method, Methods, toMethod } from "@/type/http";
import {
  OpenAPIPathItemObject,
  PathWildcard,
} from "@/coverage/openApi/operationTree";

type PartialPath = string | Symbol;

export class OperationNode {
  partialPath: PartialPath;
  private readonly children: Map<PartialPath, OperationNode> = new Map();
  private readonly operations: Map<Method, Operation> = new Map();

  constructor(partialPath: PartialPath) {
    this.partialPath = partialPath;
  }

  add(
    partialPaths: PartialPath[],
    pathItemObject: OpenAPIPathItemObject,
    specPath: string,
  ) {
    if (partialPaths.length === 0) {
      for (const [method, operationObject] of Object.entries(pathItemObject)) {
        if (!operationObject) continue;
        const m = toMethod(method);
        if (!m) continue;

        this.operations.set(m, new Operation(specPath, m, operationObject));
      }
      return;
    }

    const childPath = partialPaths[0];
    let child = this.children.get(childPath);
    if (!child) {
      child = new OperationNode(childPath);
      this.children.set(childPath, child);
    }
    child.add(partialPaths.slice(1), pathItemObject, specPath);
  }

  get(partialPaths: PartialPath[], method: Method): Operation | undefined {
    if (partialPaths.length === 0) {
      return this.operations.get(method);
    }

    const childPath = partialPaths[0];
    let child = this.children.get(childPath);
    if (!child) {
      child = this.children.get(PathWildcard);
      if (!child) return;
    }
    return child.get(partialPaths.slice(1), method);
  }

  visitOperations(visitor: (operation: Operation) => void) {
    for (const operation of this.operations.values()) {
      visitor(operation);
    }
    for (const child of this.children.values()) {
      child.visitOperations(visitor);
    }
  }
}