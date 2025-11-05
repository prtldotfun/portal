use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod events;
pub mod state;

declare_id!("PRT1xBridge1111111111111111111111111111111");

#[program]
pub mod portal_bridge {
    use super::*;
}
