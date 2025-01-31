/* global chrome */
import React, { useState, useEffect } from "react";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Typography,
  IconButton,
  Box
} from '@mui/material';
import { Edit, Delete, Save, DragIndicator } from '@mui/icons-material';

const timezones = [
  { label: "Pacific Time (PT)", zone: "America/Los_Angeles" },
  { label: "Mountain Time (MT)", zone: "America/Denver" },
  { label: "Central Time (CT)", zone: "America/Chicago" },
  { label: "Eastern Time (ET)", zone: "America/New_York" },
  { label: "Atlantic Time (AT)", zone: "America/Halifax" },
  // South American Time Zones
  { label: "Brazil (BRT)", zone: "America/Sao_Paulo" },
  { label: "Argentina (ART)", zone: "America/Argentina/Buenos_Aires" },
  { label: "Chile (CLT)", zone: "America/Santiago" },
  { label: "Peru (PET)", zone: "America/Lima" },
  { label: "Colombia (COT)", zone: "America/Bogota" },
  { label: "Venezuela (VET)", zone: "America/Caracas" },
  // Rest of World
  { label: "British Time (BST/GMT)", zone: "Europe/London" },
  { label: "Central European (CET)", zone: "Europe/Paris" },
  { label: "Eastern European (EET)", zone: "Europe/Kiev" },
  { label: "Japan (JST)", zone: "Asia/Tokyo" },
  { label: "Australia Eastern (AEST)", zone: "Australia/Sydney" },
  { label: "New Zealand (NZST)", zone: "Pacific/Auckland" }
];

const SortableItem = ({ person, editingId, onEdit, onDelete, onUpdate, name, timezone, setName, setTimezone }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: person.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card sx={{ mb: 1 }}>
        <CardContent sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          py: 1,
          '&:last-child': { pb: 1 }
        }}>
          <div {...attributes} {...listeners}>
            <IconButton size="small">
              <DragIndicator />
            </IconButton>
          </div>
          {editingId === person.id ? (
            <>
              <TextField
                size="small"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mr: 1, flexGrow: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 120, mr: 1 }}>
                <Select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {timezones.map((tz) => (
                    <MenuItem key={tz.zone} value={tz.zone}>
                      {tz.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton onClick={onUpdate} color="primary">
                <Save />
              </IconButton>
            </>
          ) : (
            <>
              <Typography sx={{ flexGrow: 1 }}>{person.name}</Typography>
              <Typography sx={{ mr: 2 }}>{person.currentTime}</Typography>
              <IconButton onClick={() => onEdit(person)} size="small">
                <Edit />
              </IconButton>
              <IconButton onClick={() => onDelete(person.id)} size="small" color="error">
                <Delete />
              </IconButton>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const TimeZoneTracker = () => {
  const [people, setPeople] = useState([]);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Load stored data from Chrome storage
  useEffect(() => {
    chrome.storage.local.get(["people"], (result) => {
      if (result.people) setPeople(result.people);
    });
  }, []);

  // Updated time calculation function
  const updateTimes = () => {
    setPeople((prevPeople) =>
      prevPeople.map((person) => ({
        ...person,
        currentTime: new Date().toLocaleTimeString('en-US', {
          timeZone: person.zone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      }))
    );
  };

  useEffect(() => {
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  // Add a person
  const addPerson = () => {
    if (!name || !timezone) return;

    const newPerson = {
      id: Date.now(),
      name,
      zone: timezone,
      currentTime: new Date().toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };

    const updatedPeople = [...people, newPerson];
    setPeople(updatedPeople);
    chrome.storage.local.set({ people: updatedPeople });

    setName("");
    setTimezone("");
  };

  // Remove a person
  const removePerson = (index) => {
    const updatedPeople = people.filter((_, i) => i !== index);
    setPeople(updatedPeople);
    chrome.storage.local.set({ people: updatedPeople });
  };

  const handleEdit = (person) => {
    setEditingId(person.id);
    setName(person.name);
    setTimezone(person.zone);
  };

  const handleUpdate = () => {
    const updatedPeople = people.map(person => 
      person.id === editingId 
        ? { ...person, name, zone: timezone }
        : person
    );
    setPeople(updatedPeople);
    chrome.storage.local.set({ people: updatedPeople });
    setEditingId(null);
    setName('');
    setTimezone('');
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setPeople((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        chrome.storage.local.set({ people: newItems });
        return newItems;
      });
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Time Zone Tracker
      </Typography>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={people.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {people.map((person) => (
            <SortableItem
              key={person.id}
              person={person}
              editingId={editingId}
              onEdit={handleEdit}
              onDelete={removePerson}
              onUpdate={handleUpdate}
              name={name}
              timezone={timezone}
              setName={setName}
              setTimezone={setTimezone}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          placeholder="Enter Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">Select Timezone</MenuItem>
            {timezones.map((tz) => (
              <MenuItem key={tz.zone} value={tz.zone}>
                {tz.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button 
          variant="contained" 
          onClick={addPerson}
          disabled={!name || !timezone}
        >
          Add
        </Button>
      </Box>
    </Box>
  );
};

export default TimeZoneTracker;
