"use client"

import { useState } from "react"
import { PlusCircle, Trash2, Edit, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

interface Attribute {
  name: string
  displayName: string
  description: string
  dataType: string
  required: boolean
  pii: boolean
}

interface AttributeEditorProps {
  attributes: Attribute[]
}

export function AttributeEditor({ attributes: initialAttributes }: AttributeEditorProps) {
  const [attributes, setAttributes] = useState<Attribute[]>(initialAttributes)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Attribute | null>(null)

  const handleToggleRequired = (index: number) => {
    const newAttributes = [...attributes]
    newAttributes[index].required = !newAttributes[index].required
    setAttributes(newAttributes)
  }

  const handleTogglePII = (index: number) => {
    const newAttributes = [...attributes]
    newAttributes[index].pii = !newAttributes[index].pii
    setAttributes(newAttributes)
  }

  const handleAddAttribute = () => {
    const newAttribute = {
      name: `attribute_${attributes.length + 1}`,
      displayName: `New Attribute ${attributes.length + 1}`,
      description: "Description of the new attribute",
      dataType: "string",
      required: false,
      pii: false,
    }

    setAttributes([...attributes, newAttribute])
    setEditingIndex(attributes.length)
    setEditForm(newAttribute)

    toast({
      title: "Attribute Added",
      description: "A new attribute has been added to the schema.",
    })
  }

  const handleRemoveAttribute = (index: number) => {
    const attributeName = attributes[index].displayName
    const newAttributes = [...attributes]
    newAttributes.splice(index, 1)
    setAttributes(newAttributes)

    if (editingIndex === index) {
      setEditingIndex(null)
      setEditForm(null)
    }

    toast({
      title: "Attribute Removed",
      description: `The attribute "${attributeName}" has been removed from the schema.`,
    })
  }

  const handleEditAttribute = (index: number) => {
    setEditingIndex(index)
    setEditForm({ ...attributes[index] })
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditForm(null)
  }

  const handleSaveEdit = () => {
    if (editingIndex !== null && editForm) {
      const newAttributes = [...attributes]
      newAttributes[editingIndex] = editForm
      setAttributes(newAttributes)
      setEditingIndex(null)
      setEditForm(null)

      toast({
        title: "Attribute Updated",
        description: `The attribute "${editForm.displayName}" has been updated.`,
      })
    }
  }

  const handleEditFormChange = (field: keyof Attribute, value: string | boolean) => {
    if (editForm) {
      setEditForm({
        ...editForm,
        [field]: value,
      })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Badge className="bg-primary">{attributes.length} Attributes</Badge>
        <Button variant="outline" size="sm" onClick={handleAddAttribute}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Attribute
        </Button>
      </div>
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-4">
          {attributes.map((attr, index) => (
            <div key={index} className="rounded-md border p-3 space-y-3 bg-muted/10">
              {editingIndex === index ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Display Name</label>
                      <Input
                        value={editForm?.displayName}
                        onChange={(e) => handleEditFormChange("displayName", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Field Name</label>
                      <Input
                        value={editForm?.name}
                        onChange={(e) => handleEditFormChange("name", e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Description</label>
                    <Input
                      value={editForm?.description}
                      onChange={(e) => handleEditFormChange("description", e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Data Type</label>
                      <Select
                        value={editForm?.dataType}
                        onValueChange={(value) => handleEditFormChange("dataType", value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="integer">Integer</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="object">Object</SelectItem>
                          <SelectItem value="array">Array</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editForm?.required}
                        onCheckedChange={(checked) => handleEditFormChange("required", checked)}
                      />
                      <label className="text-xs font-medium">Required</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editForm?.pii}
                        onCheckedChange={(checked) => handleEditFormChange("pii", checked)}
                      />
                      <label className="text-xs font-medium">PII</label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} className="bg-primary">
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{attr.displayName}</p>
                      <p className="text-xs text-muted-foreground">{attr.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditAttribute(index)}>
                        <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveAttribute(index)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{attr.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="outline" className="bg-primary/5">
                      {attr.dataType}
                    </Badge>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">Required</span>
                        <Switch checked={attr.required} onCheckedChange={() => handleToggleRequired(index)} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">PII</span>
                        <Switch checked={attr.pii} onCheckedChange={() => handleTogglePII(index)} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
