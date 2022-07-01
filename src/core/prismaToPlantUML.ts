import { DMMF } from '@prisma/generator-helper'
import { getDMMF } from '@prisma/internals'
import { prismaEnumToPlantUMLEnum } from './enum/prismaEnumToPlantUMLEnum'
import { prismaModelToPlantUMLEntity } from './entity/prismaModelToPlantUMLEntity'
import { addNewLine, StringBuilderArtifact } from './common'
import {
  getPlantUMLGraphFromPrismaDatamodel,
  isEnum,
  isModel,
  Cardinality,
  GraphEntity,
  Relation,
} from './graph/getPlantUMLGraphFromPrismaDatamodel'
import { GraphEdge } from 'typescript-generic-datastructures'

export interface PlantUMLRelation {
  start: DMMF.Model | DMMF.DatamodelEnum
  cardinality: Cardinality
  end: DMMF.Model | DMMF.DatamodelEnum
}
export function prismaToPlantUML(dmmf: DMMF.Document, fullRelationLinks: boolean) {
  const graph = getPlantUMLGraphFromPrismaDatamodel(dmmf.datamodel)
  const enums = graph
    .getAllVertices()
    .filter((vertex) => isEnum(vertex.value))
    .map((vertexEnum) => (isEnum(vertexEnum.value) ? prismaEnumToPlantUMLEnum(vertexEnum.value) : undefined))
  const entities = graph
    .getAllVertices()
    .filter((vertex) => isModel(vertex.value))
    .map((vertexModel) => (isModel(vertexModel.value) ? prismaModelToPlantUMLEntity(vertexModel.value) : undefined))

  const relations = fullRelationLinks
    ? graph.getAllEdges().map(edgeToRelation)
    : graph.getAllVertices().reduce<PlantUMLRelation[]>((acc, vertex) => {
        vertex.getEdges().forEach((edge) => {
          acc.push(edgeToRelation(edge))
        })
        return acc
      }, [])

  const builder = []
  builder.push(addNewLine('@startuml', 2))
  builder.push(addNewLine('skinparam linetype ortho', 2))
  builder.push(enums.concat(entities).join(`${StringBuilderArtifact.Breakline}${StringBuilderArtifact.Breakline}`)) // Add Enums and Entities
  builder.push(addNewLine('', 2))
  builder.push(relations.map(plantUMLRelationToString).join(StringBuilderArtifact.Breakline))
  builder.push(addNewLine('', 2), addNewLine('@enduml', 1))

  return builder.join('')
}

function edgeToRelation(edge: GraphEdge<GraphEntity, Relation>): PlantUMLRelation {
  return {
    start: edge.startVertex.value,
    cardinality: edge.value.cardinality,
    end: edge.endVertex.value,
  }
}

export function plantUMLRelationToString(relation: PlantUMLRelation) {
  const builder = []
  builder.push(
    relation.start.name,
    StringBuilderArtifact.WhiteSpace,
    relation.cardinality.start,
    StringBuilderArtifact.DoubleDots,
    relation.cardinality.end,
    StringBuilderArtifact.WhiteSpace,
    relation.end.name,
  )
  return builder.join('')
}

export function loadPrismaSchema(path: string) {
  return getDMMF({ datamodelPath: path })
}
