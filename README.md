nuxeo-automation-jsshell
========================

Simple JS Automation Shell

Simple JS Terminal Emulator connected to a remote Nuxeo using Nuxeo Automation JS client.


# Nuxeo Shell walkthrough

Nuxeo Shell is based on `nuxeo.js` Automation client.

## Basic commands

It exposes basic commands to browse the repository `cd`  `pwd` `ls`

*Context may be initialized from Web navigation context.*

Help is available via : 

    help cmds

Shell provides a pluggable command completion system

Completion on command names

    vi (+TAB)

Completion on command arguments

    cd /def (+TAB)
 
To view properties of a Document

    view /default-domain/workspaces/NuxeoJSShell/NuxeoJavaScriptShell

Long lists are automatically handle.

You can use the `select` command to search in the repository.

    select * from Document where ecm:lockOwner is not NULL

    select * from Document where ecm:lockOwner is NULL

You can run simple batch processing by "piping" the result of a select in an Automation Operation 

    select * from Note where ecm:isCheckedInVersion=0 | Document.SetProperty value=Hello xpath=dc:description

## Automation Call

You can use the shell to execute Automation Operations and Chains.

View existing  operations : 

    help ops

View detail about an operation : 

    help Document.Lock

Operation have also completion on parameters names and value.

    Document.Lock doc:/default-domain/workspaces/NuxeoJSShell/NuxeoJavaScriptShell

You can check that the document is now locked

    select * from Document where ecm:lockOwner is not NULL

To release the lock :

    Document.Unlock doc:/default-domain/workspaces/NuxeoJSShell/NuxeoJavaScriptShell

## Command sets

You can contribute new Commands that will be available inside the shell.

The current implementation contains 4 command sets.

 - internal and Automation commands
 - built-ins command set
 - tests command set
 - quake command

The tests plugin is available in the PopUp version of the shell.

Click on popup button 

Verify that you have new command available

    help cmds

Run the Automation unit tests

    tests

    testsGUI

## Debuging

When loaded in a Seam context, the shell will give you access to content of the Seam context

Fetch current user

    Seam.Eval expr=currentUser.name

    Seam.Eval expr=currentUser.groups

Get info about the current page provider

    Seam.Eval expr=contentViewActions.getCurrentContentView().getCurrentPageProvider().definition.whereClause.fixedPart

You can alter page provider properties

    Seam.Eval expr=contentViewActions.getCurrentContentView().getCurrentPageProvider().setPageSize(2)

Automation Exception management.

You can enable/disable Automation tracking via 

    Traces.ToggleRecording

When an error occurs you can extract the trace from the server :

    Document.Fetch value=/idonotexists 

Hit s to see the full stack

    Document.Fetch 

## Game on



